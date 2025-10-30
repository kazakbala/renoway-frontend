-- Create invitations table
CREATE TABLE public.invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, email)
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_tenant_id ON public.invitations(tenant_id);

-- RLS policies for invitations
CREATE POLICY "Users can view invitations in their tenant"
ON public.invitations FOR SELECT
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can create invitations in their tenant"
ON public.invitations FOR INSERT
WITH CHECK (tenant_id = public.get_user_tenant_id() AND invited_by = auth.uid());

CREATE POLICY "Users can delete invitations in their tenant"
ON public.invitations FOR DELETE
USING (tenant_id = public.get_user_tenant_id());

-- Update handle_new_user to check for invitation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id UUID;
  invitation_record RECORD;
BEGIN
  -- Check if there's a pending invitation for this email
  SELECT * INTO invitation_record
  FROM public.invitations
  WHERE email = NEW.email 
    AND status = 'pending' 
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF invitation_record.id IS NOT NULL THEN
    -- User was invited, join the existing tenant
    new_tenant_id := invitation_record.tenant_id;
    
    -- Mark invitation as accepted
    UPDATE public.invitations
    SET status = 'accepted'
    WHERE id = invitation_record.id;
  ELSE
    -- No invitation, create a new tenant
    INSERT INTO public.tenants (name)
    VALUES (COALESCE(NEW.email, 'Organization'))
    RETURNING id INTO new_tenant_id;
  END IF;
  
  -- Create the profile with the tenant_id
  INSERT INTO public.profiles (user_id, email, tenant_id)
  VALUES (NEW.id, NEW.email, new_tenant_id);
  
  RETURN NEW;
END;
$$;