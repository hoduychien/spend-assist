-- Gỡ tính năng đồng bộ Gmail.
-- GIỮ LẠI transactions.source / external_id + unique index — tính năng Dư nợ
-- dùng external_id ("debt:<id>") để hoàn tác khoản chi trả nợ.

drop function if exists public.import_bank_transaction(uuid, text, bigint, text, date);
drop function if exists public.rotate_import_token();

alter table public.profiles drop column if exists import_token;
