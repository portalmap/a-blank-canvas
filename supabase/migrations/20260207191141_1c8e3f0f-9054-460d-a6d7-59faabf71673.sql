
-- Função que deleta automações vinculadas ao registro excluído
CREATE OR REPLACE FUNCTION public.delete_related_automations()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM automations
  WHERE scope_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger na tabela spaces
CREATE TRIGGER trigger_delete_space_automations
  BEFORE DELETE ON spaces
  FOR EACH ROW
  EXECUTE FUNCTION delete_related_automations();

-- Trigger na tabela folders
CREATE TRIGGER trigger_delete_folder_automations
  BEFORE DELETE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION delete_related_automations();

-- Trigger na tabela lists
CREATE TRIGGER trigger_delete_list_automations
  BEFORE DELETE ON lists
  FOR EACH ROW
  EXECUTE FUNCTION delete_related_automations();
