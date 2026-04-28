-- Recreate quotes INSERT policy explicit for anon + authenticated
DROP POLICY IF EXISTS "anyone creates quote" ON public.quotes;
CREATE POLICY "anyone creates quote"
ON public.quotes
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(customer_name) BETWEEN 1 AND 200
  AND char_length(email) BETWEEN 3 AND 320
  AND char_length(whatsapp) BETWEEN 5 AND 40
);

-- Same for quote_items
DROP POLICY IF EXISTS "anyone creates quote_items" ON public.quote_items;
CREATE POLICY "anyone creates quote_items"
ON public.quote_items
FOR INSERT
TO anon, authenticated
WITH CHECK (
  quantity > 0
  AND char_length(product_name) BETWEEN 1 AND 200
  AND unit_price >= 0
);

-- Cleanup test row
DELETE FROM public.quotes WHERE id = '4b2f87d6-8299-4c4b-813d-330ce98733fb';