import { randomBytes } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const envPath = path.join(root, ".env.local");
let existing = "";
try { existing = await readFile(envPath, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
if (/^HTLL_ADMIN_PASSWORD=/m.test(existing)) {
  console.log("Yönetici şifresi zaten tanımlı; değiştirilmedi.");
} else {
  const password = randomBytes(24).toString("base64url");
  await appendFile(envPath, `\nHTLL_ADMIN_PASSWORD=${password}\n`, { mode: 0o600 });
  await mkdir(path.join(root, "work"), { recursive: true });
  const file = path.join(root, "work/admin-access.txt");
  await writeFile(file, `HTLL yönetim ekranı\n\nAdres: http://localhost:3000/admin\nŞifre: ${password}\n\nBu dosyayı özel tut. Şifre yalnızca bu bilgisayardaki yerel ortam için oluşturuldu.\nSunucuyu şifre değişikliğinden sonra yeniden başlat.\n`, { mode: 0o600 });
  console.log("Yönetici şifresi oluşturuldu. Erişim bilgileri: work/admin-access.txt");
}
