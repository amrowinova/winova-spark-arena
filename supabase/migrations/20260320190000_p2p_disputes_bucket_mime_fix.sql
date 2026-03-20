-- Remove image/webp from p2p-disputes bucket allowed MIME types.
-- Only JPEG, PNG, and PDF are accepted for dispute evidence files.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'application/pdf']
WHERE id = 'p2p-disputes';
