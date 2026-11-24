create policy "Authenticated customers can view active products"
on public.products
for select
to authenticated
using (is_active = true);
