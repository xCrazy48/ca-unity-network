
-- Avatars: user files live under {user_id}/...
CREATE POLICY "own avatars read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own avatars write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own avatars update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own avatars delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Notes bucket
CREATE POLICY "own notes read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'user-notes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own notes write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-notes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own notes update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'user-notes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own notes delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'user-notes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Admin read across both buckets
CREATE POLICY "admin read all storage" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('avatars','user-notes') AND private.has_role(auth.uid(), 'admin'));
