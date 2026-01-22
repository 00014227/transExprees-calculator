WITH input_rows AS (
  SELECT *
  FROM jsonb_to_recordset(p_rows)
  AS r(
    row_id TEXT,
    from_city TEXT,
    to_city TEXT,
    service_type_id INT,
    weight NUMERIC
  )
),

cities_joined AS (
  SELECT
    r.*,
    cf.hub_id AS from_hub_id,
    cf.is_hub AS from_is_hub,
    ct.hub_id AS to_hub_id,
    ct.is_hub AS to_is_hub,
    CASE
      WHEN cf.id IS NULL THEN 'From city not found'
      WHEN ct.id IS NULL THEN 'To city not found'
    END AS city_error
  FROM input_rows r
  LEFT JOIN cities cf ON lower(cf.name) = lower(r.from_city)
  LEFT JOIN cities ct ON lower(ct.name) = lower(r.to_city)
),

zones AS (
  SELECT
    c.*,
    zm.zone,
    CASE
      WHEN c.city_error IS NOT NULL THEN c.city_error
      WHEN zm.zone IS NULL THEN 'Zone not found'
    END AS zone_error
  FROM cities_joined c
  LEFT JOIN zone_matrix zm
    ON zm.from_hub_id = c.from_hub_id
   AND zm.to_hub_id   = c.to_hub_id
),

/* ---------- BASE PRICE (WEIGHT IS HERE) ---------- */
base_prices AS (
  SELECT
    z.*,
    zwp.price AS base_price,
    zwp.client_id AS tariff_client_id,
    zwp.id AS base_price_id,
    CASE
      WHEN z.zone_error IS NOT NULL THEN z.zone_error
      WHEN zwp.price IS NULL THEN 'Base price not found'
    END AS price_error
  FROM zones z
  LEFT JOIN zone_weight_prices zwp
    ON zwp.service_type_id = z.service_type_id
   AND zwp.zone = z.zone
   AND zwp.weight_kg = LEAST(CEIL(z.weight), 20)
   AND (zwp.client_id = p_client_id OR zwp.client_id IS NULL)
),

base_price_final AS (
  SELECT DISTINCT ON (row_id)
    *
  FROM base_prices
  ORDER BY row_id, tariff_client_id DESC NULLS LAST, base_price_id DESC NULLS LAST
),

/* ---------- MIN WEIGHT_TO_NORM FOR ROUTE (for surcharge_per_kg calculation) ---------- */
min_weight_norm AS (
  SELECT
    b.*,
    (
      SELECT MIN(rsr.weight_to_norm)
      FROM route_surcharge_rules rsr
      WHERE rsr.from_is_hub = b.from_is_hub
        AND rsr.to_is_hub = b.to_is_hub
        AND rsr.surcharge_per_kg IS NOT NULL
        AND rsr.surcharge_per_kg > 0
        AND rsr.weight_to_norm IS NOT NULL
        AND rsr.weight_to_norm > 0
        AND (
          rsr.client_id = p_client_id
          OR (
            rsr.client_id IS NULL
            AND NOT EXISTS (
              SELECT 1
              FROM route_surcharge_rules r2
              WHERE r2.client_id = p_client_id
                AND r2.from_is_hub = b.from_is_hub
                AND r2.to_is_hub = b.to_is_hub
                AND r2.surcharge_per_kg IS NOT NULL
                AND r2.surcharge_per_kg > 0
                AND r2.weight_to_norm IS NOT NULL
                AND r2.weight_to_norm > 0
            )
          )
        )
    ) AS min_weight_to_norm
  FROM base_price_final b
),

/* ---------- ROUTE SURCHARGE (STRICT RANGE MATCH) ---------- */
route_surcharge AS (
  SELECT
    m.*,
    COALESCE((
      SELECT
        COALESCE(rsr.base_surcharge, 0)
        + CASE
            -- Apply surcharge_per_kg for each kg AFTER the minimum weight_to_norm
            -- Use the minimum weight_to_norm from all rules with surcharge_per_kg for this route
            WHEN rsr.surcharge_per_kg IS NOT NULL 
                 AND rsr.surcharge_per_kg > 0 
                 AND m.min_weight_to_norm IS NOT NULL
                 AND CEIL(m.weight) > m.min_weight_to_norm THEN
              (CEIL(m.weight) - m.min_weight_to_norm) * rsr.surcharge_per_kg
            ELSE 0
          END
      FROM route_surcharge_rules rsr
      WHERE
        rsr.from_is_hub = m.from_is_hub
        AND rsr.to_is_hub = m.to_is_hub

        AND (
          rsr.client_id = p_client_id
          OR (
            rsr.client_id IS NULL
            AND NOT EXISTS (
              SELECT 1
              FROM route_surcharge_rules r2
              WHERE r2.client_id = p_client_id
                AND r2.from_is_hub = m.from_is_hub
                AND r2.to_is_hub   = m.to_is_hub
                AND CEIL(m.weight) >= r2.weight_from
                AND (
                  r2.weight_to IS NULL
                  OR CEIL(m.weight) <= r2.weight_to
                )
            )
          )
        )

        AND CEIL(m.weight) >= rsr.weight_from
        AND (
          rsr.weight_to IS NULL
          OR CEIL(m.weight) <= rsr.weight_to
        )

      ORDER BY 
        CASE WHEN rsr.client_id = p_client_id THEN 0 ELSE 1 END,
        rsr.weight_from DESC,
        COALESCE(rsr.weight_to, 2147483647) ASC,
        rsr.id DESC
      LIMIT 1
    ), 0) AS route_price
  FROM min_weight_norm m
),

/* ---------- ZONE OVERWEIGHT PRICE (FOR WEIGHTS > 20KG) ---------- */
zone_overweight AS (
  SELECT
    r.*,
    CASE
      WHEN CEIL(r.weight) > 20 THEN
        COALESCE((
          SELECT
            (CEIL(r.weight) - 20) * COALESCE(zor.extra_price_per_kg, 0)
          FROM zone_overweight_rules zor
          WHERE
            zor.zone = r.zone
            AND zor.service_type_id = r.service_type_id
            AND (zor.client_id = p_client_id OR zor.client_id IS NULL)
          ORDER BY
            CASE WHEN zor.client_id = p_client_id THEN 0 ELSE 1 END,
            zor.id DESC
          LIMIT 1
        ), 0)
      ELSE 0
    END AS zone_overweight_price
  FROM route_surcharge r
)


/* ---------- RESULT ---------- */
SELECT jsonb_agg(
  jsonb_build_object(
    'row_id', row_id,
    'total_price',
      CASE
        WHEN price_error IS NOT NULL THEN NULL
        ELSE base_price + route_price + zone_overweight_price
      END,
    'error', price_error
  )
)
FROM zone_overweight;
