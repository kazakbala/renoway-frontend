-- Update handle_new_user function to use company name from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_tenant_id UUID;
  invitation_record RECORD;
  company_name TEXT;
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
    -- No invitation, create a new tenant with company name from metadata
    company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', NEW.email);
    
    INSERT INTO public.tenants (name)
    VALUES (company_name)
    RETURNING id INTO new_tenant_id;
  END IF;
  
  -- Create the profile with the tenant_id
  INSERT INTO public.profiles (user_id, email, tenant_id)
  VALUES (NEW.id, NEW.email, new_tenant_id);
  
  RETURN NEW;
END;
$function$;