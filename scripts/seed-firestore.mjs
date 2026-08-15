// 動作確認用のサンプル案件を Firestore に投入するスクリプト（任意・本番では実行不要）。
//
// 実行方法:
//   node scripts/seed-firestore.mjs
//
// .env.local に FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY が
// 設定されている必要があります。

import { readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

function loadEnvLocal() {
  try {
    const text = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    for (const rawLine of text.split('\n')) {
      const line = rawLine.replace(/\r$/, ''); // Windows改行(CRLF)対策
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;

      const key = m[1];
      let value = m[2].trim();
      // 前後を "..." または '...' で囲んでいる場合はクォートを取り除く
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env.local が無ければ環境変数がすでに設定されている前提で続行
  }
}
loadEnvLocal();

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});
const db = getFirestore(app);

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return Timestamp.fromDate(d);
}

const volunteers = [
  {
    title: '河川清掃ボランティア',
    description:
      '地域を流れる川の河川敷でゴミ拾いを行います。軍手・トングはこちらで用意します。動きやすい服装でお越しください。',
    category: '環境',
    area: '名古屋市',
    eventDate: daysFromNowDateString(14),
    startTime: '09:00',
    endTime: '12:00',
    location: '地下鉄〇〇駅 北口 集合',
    points: 30,
    maxCapacity: 20,
    currentApplicants: 0,
    deadline: daysFromNow(10),
    beginnerFriendly: true,
    status: 'published',
    orgName: 'NPO法人 なごやのかわ',
    orgDescription: '庄内川流域の環境保全に取り組む団体です。',
    orgImageUrl: null,
    createdBy: null,
  },
  {
    title: 'こども食堂 調理・配膳サポート',
    description: '月に一度のこども食堂で、調理補助と配膳をお願いします。調理経験は問いません。',
    category: '福祉',
    area: '豊田市',
    eventDate: daysFromNowDateString(7),
    startTime: '15:00',
    endTime: '19:00',
    location: '〇〇区民センター 1F 調理室',
    points: 50,
    maxCapacity: 8,
    currentApplicants: 0,
    deadline: daysFromNow(4),
    beginnerFriendly: true,
    status: 'published',
    orgName: '一般社団法人 まちのだいどころ',
    orgDescription: '地域の子どもたちに温かい食事を届けています。',
    orgImageUrl: null,
    createdBy: null,
  },
  {
    title: '地域夏祭り 運営スタッフ',
    description: '受付・会場案内・片付けをお願いします。当日は屋外での作業が中心です。',
    category: 'イベント',
    area: '岡崎市',
    eventDate: daysFromNowDateString(30),
    startTime: '13:00',
    endTime: '21:00',
    location: '〇〇公園 本部テント',
    points: 80,
    maxCapacity: 15,
    currentApplicants: 0,
    deadline: daysFromNow(20),
    beginnerFriendly: false,
    status: 'published',
    orgName: '〇〇商店会',
    orgDescription: '毎年恒例の夏祭りを運営しています。',
    orgImageUrl: null,
    createdBy: null,
  },
];

function daysFromNowDateString(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const batch = db.batch();
for (const v of volunteers) {
  const ref = db.collection('volunteers').doc();
  batch.set(ref, {
    ...v,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
await batch.commit();

console.log(`${volunteers.length}件のサンプル案件を登録しました。`);
process.exit(0);
