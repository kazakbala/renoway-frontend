-- Allow users to update their tenant name
CREATE POLICY "Users can update their tenant name"
ON public.tenants
FOR UPDATE
TO authenticated
USING (id = get_user_tenant_id())
WITH CHECK (id = get_user_tenant_id());