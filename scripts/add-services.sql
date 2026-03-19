-- Add services to shops that don't have any
DO $$
DECLARE
    shop_rec RECORD;
BEGIN
    FOR shop_rec IN 
        SELECT s.id, s.name 
        FROM shops s 
        LEFT JOIN services srv ON s.id = srv.shop_id
        WHERE srv.id IS NULL
    LOOP
        RAISE NOTICE 'Adding services to: %', shop_rec.name;
        
        INSERT INTO services (id, shop_id, name, description, duration_minutes, price, sort_order, is_active, created_at, updated_at)
        VALUES
            (gen_random_uuid(), shop_rec.id, 'Haircut - Men', 'Professional haircut with styling', 30, 400, 1, true, NOW(), NOW()),
            (gen_random_uuid(), shop_rec.id, 'Haircut - Women', 'Stylish cut with wash and blow dry', 45, 800, 2, true, NOW(), NOW()),
            (gen_random_uuid(), shop_rec.id, 'Hair Color', 'Premium hair coloring services', 90, 2500, 3, true, NOW(), NOW()),
            (gen_random_uuid(), shop_rec.id, 'Beard Trim', 'Professional beard trimming and styling', 15, 200, 4, true, NOW(), NOW()),
            (gen_random_uuid(), shop_rec.id, 'Hair Spa', 'Deep conditioning hair treatment', 60, 1500, 5, true, NOW(), NOW()),
            (gen_random_uuid(), shop_rec.id, 'Facial', 'Refreshing facial treatment', 45, 800, 6, true, NOW(), NOW());
    END LOOP;
END $$;

SELECT s.name, COUNT(srv.id) as service_count 
FROM shops s 
LEFT JOIN services srv ON s.id = srv.shop_id 
GROUP BY s.name;
