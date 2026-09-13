-- Adds 'ai' source to the public.message_source enum so AI assistant auto-replies
-- are clearly categorized in the messages table.

alter type public.message_source add value if not exists 'ai';
