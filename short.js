import express from "express";
import fetch from "node-fetch";
const app = express();

const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
const BITLY_ACCESS_TOKEN = process.env.BITLY_ACCESS_TOKEN;

app.use(express.json());


function extractUrl(string) {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const urls = string.match(urlPattern);
  return urls ? urls[0] : null;
}


async function shortenWithBitly(longUrl) {
  const response = await fetch("https://api-ssl.bitly.com/v4/shorten", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BITLY_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ long_url: longUrl }),
  });
  const data = await response.json();
  if (data.link) {
    return data.link;
  } else {
    throw new Error(data.description || "Error shortening URL");
  }
}

async function replyToUser(replyToken, message) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      replyToken: replyToken,
      messages: [{ type: "text", text: message }],
    }),
  });
}
app.post("/webhook", async (req, res) => {
  const events = req.body.events;
  for (let event of events) {
    if (event.type === "message" && event.message.type === "text") {
      const userMessage = event.message.text;
      const replyToken = event.replyToken;

      const url = extractUrl(userMessage);

      if (url) {
        try {
          const shortUrl = await shortenWithBitly(url);
          await replyToUser(replyToken, `ลิงก์สั้นของคุณคือ: ${shortUrl}`);
        } catch (error) {
          await replyToUser(replyToken, "ขออภัย เกิดข้อผิดพลาดในการย่อลิงก์");
        }
      } else {
        await replyToUser(replyToken, "กรุณาส่ง URL ที่ต้องการย่อมาให้บอท");
      }
    }
  }
  res.sendStatus(200);
});

// เริ่มเซิร์ฟเวอร์
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
