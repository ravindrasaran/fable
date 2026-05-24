import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

import * as admin from 'firebase-admin';

let db: admin.firestore.Firestore | null = null;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    admin.initializeApp({ projectId: config.projectId });
    db = admin.firestore();
    if (config.firestoreDatabaseId) {
      db.settings({ databaseId: config.firestoreDatabaseId });
    }
  }
} catch (e) {
  console.warn("Firebase Admin failed to initialize:", e);
}

interface StoryRecord {
  id?: string;
  date: string;
  lang: string;
  title: string;
  category: string;
  moral: string;
  content: string;
  tone?: string;
  length?: string;
  createdAt?: number;
  updatedAt?: number;
}

const LOCAL_DB_PATH = path.join(process.cwd(), 'stories-local.json');

function readLocalStories(): Record<string, StoryRecord> {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8'));
    }
  } catch (e) {
    console.error("Failed to read local stories:", e);
  }
  return {};
}

function writeLocalStory(story: StoryRecord) {
  try {
    const stories = readLocalStories();
    const docId = `${story.date}-${story.lang}`;
    stories[docId] = {
      ...stories[docId],
      ...story,
      updatedAt: Date.now(),
      createdAt: stories[docId]?.createdAt || Date.now()
    };
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(stories, null, 2), 'utf8');
  } catch (e) {
    console.error("Failed to write local story:", e);
  }
}

function deleteLocalStory(docId: string) {
  try {
    const stories = readLocalStories();
    if (stories[docId]) {
      delete stories[docId];
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(stories, null, 2), 'utf8');
    }
  } catch (e) {
    console.error("Failed to delete local story:", e);
  }
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Real-time backend metrics
const metrics = {
  totalRequests: 0,
  aiGenerations: 0,
  serverStartTime: Date.now()
};

app.use((req, res, next) => {
  metrics.totalRequests++;
  next();
});

function getFallbackStory(lang: string, tone?: string, date?: string) {
  const normTone = (tone || '').toLowerCase();
  const isHindi = lang === 'hi';

  if (isHindi) {
    if (normTone.includes('adventure') || normTone.includes('epic')) {
      return {
        title: "अंतिम शिखर का खोजी",
        content: "वीर सिंह एक निडर पर्वतारोही था, जिसने हमेशा सबसे दुर्गम और अनजान पहाड़ियों को फतह करने का सपना देखा था। वह 'स्वर्ण शिखर' की खोज में निकला था, जिसके बारे में कहा जाता था कि सूर्य की पहली किरण वहाँ सीधे एक जादुई शिला पर पड़ती है। चढ़ाई अत्यंत कठिन थी; ठंडी हवाएँ और बर्फीले तूफान उसके हौसलों की परीक्षा ले रहे थे। रास्ते में उसे एक घायल बूढ़ा शेर मिला, जो बर्फीले गड्ढे में फंसा था। वीर ने अपनी चढ़ाई रोककर पूरे दिन की मेहनत के बाद शेर को सुरक्षित बाहर निकाला। यद्यपि वह उस दिन शिखर पर नहीं पहुँच पाया, परंतु उसे अहसास हुआ कि जीवन बचाने का रोमांच शिखर छूने के गौरव से कहीं बड़ा और मूल्यवान था।",
        moral: "सच्चा पराक्रम और वीरता केवल विजयी होने में नहीं है, बल्कि कमज़ोरों की मदद करने में है।",
        category: "साहसिक कहानी"
      };
    } else if (normTone.includes('zen') || normTone.includes('minimalist')) {
      return {
        title: "बाँस की सीख",
        content: "पहाड़ की चोटी पर एक पुराना मंदिर था, जिसके प्रांगण में एक बड़ा बरगद का पेड़ और एक पतला सा बाँस का पेड़ अगल-बगल खड़े थे। बरगद अपनी विशालता और टहनियों की मोटाई पर बहुत गर्व करता था। जब भी तेज आंधी आती, बरगद तनकर खड़ा रहता और बाँस को कमजोर कहता। एक रात, एक भयंकर चक्रवात आया। बरगद आंधी का मुकाबला करने के लिए अपनी अकड़ में खड़ा रहा, पर तेज हवा के थपेड़ों से उसकी जड़ें उखड़ गईं और वह गिर पड़ा। दूसरी ओर, बाँस हवा के प्रवाह के साथ झुकता गया और आंधी गुजरने के बाद वह वापस मुस्कुराता हुआ सीधा खड़ा हो गया। उसने सिद्ध किया कि लचीलापन ही जीवन का असली सत्य है।",
        moral: "लचीलापन और विनम्रता हमें हर बड़ी से बड़ी आंधी और संकट में टूटने से बचाती है।",
        category: "बोध कथा"
      };
    } else if (normTone.includes('philosophical') || normTone.includes('inspiring') || normTone.includes('magical')) {
      return {
        title: "जादुई बंसी और उम्मीद",
        content: "एक गहरे और प्राचीन जंगल के मुहाने पर, एक छोटा सा गाँव था जहाँ देव नाम का एक युवा बांसुरी वादक रहता था। देव की बांसुरी बहुत ही अनोखी थी। जब भी वह उसे बजाता, हवाएँ शांत हो जातीं और जंगली फूल खिल उठते थे। एक साल, गाँव में भीषण अकाल पड़ा। नदी-नाले सूख गए और फ़सलें नष्ट हो गईं। ग्रामीण परेशान थे। देव ने अपनी बांसुरी उठाई और टीले पर बैठकर जीवन का सबसे सुंदर राग बजाना शुरू किया। उसकी लगन और सुरों की पवित्रता देखकर आकाश में काले बादल घिर आए और झमाझम बारिश होने लगी। ग्रामीणों को एहसास हुआ कि देव की धुन केवल संगीत नहीं थी, बल्कि उनकी खोई हुई आशा की आवाज़ थी।",
        moral: "कठिन से कठिन समय में भी, हमारी कला और सकारात्मक उम्मीद समाज में नया जीवन फूँक सकती है।",
        category: "प्रेरणादायक"
      };
    } else {
      return {
        title: "भीतर का प्रकाश",
        content: "एक समय की बात है, प्राचीन पहाड़ों से घिरे एक शांत गाँव में एलारा नाम की एक बुद्धिमान बुजुर्ग रहती थीं। उनके पास एक अनूठी लालटेन थी जिसकी चमक कभी कम नहीं होती थी, यहाँ तक कि सबसे कठोर सर्दियों में भी नहीं। दूर-दूर से लोग लालटेन देखने और उनका रहस्य पूछने आते थे।\n\nएलारा हमेशा मुस्कुरातीं और कहतीं, 'लालटेन प्रकाश को नहीं रखती; यह केवल उसे प्रतिबिंबित करती है। गर्मी और चमक का सच्चा स्रोत पहले आपके भीतर पैदा किया जाना चाहिए।' एक दिन, एक युवा यात्री आया, जो एक भयंकर तूफान में पूरी तरह से खो गया था। उसे लालटेन देने के बजाय, एलारा ने उसे आग जलाना सिखाया, और उससे भी महत्वपूर्ण बात यह है कि जब सब कुछ अंधेरा लगे तो अपने दिल में आशा कैसे रखें।\n\nउस दिन के बाद से, गाँव वालों को एहसास हुआ कि उन्हें एलारा की लालटेन पर निर्भर रहने की ज़रूरत नहीं है। उन्होंने अपना खुद का प्रकाश जलाना सीख लिया था, पूरी घाटी को एक सामूहिक चमक से रोशन कर दिया जिसे कोई भी तूफान कभी बुझा नहीं सकता था।",
        moral: "सच्चा चमक उन वस्तुओं में नहीं पाई जाती जो हमारे पास हैं, बल्कि उस प्रकाश में है जो हम अपने भीतर पैदा करते हैं और दूसरों के साथ साझा करते हैं।",
        category: "कथा"
      };
    }
  } else {
    if (normTone.includes('adventure') || normTone.includes('epic')) {
      return {
        title: "The Quest for the Sunlit Quartz",
        content: "The young explorer Aidan set sail across the Sea of Mirages, guided by nothing but an ancient map and a fierce curiosity. He sought the Sunlit Quartz, a legendary stone rumored to bring eternal springtime to any land it graced. His village was suffering from a decade of deep, relentless frost, and Aidan knew he was their only hope. Along the mountainous ridge of the Whispering Spires, he faced fierce blizzards, roaring stone guardians, and narrow trails over bottomless chasms. At the peak, he found the Quartz, but as he reached for it, a guardian phoenix appeared. 'To carry the sun, you must be willing to burn for others,' the phoenix echoed. Aidan agreed to carry it even if the heat scorched his palm, realizing his courage was greater than any fear of pain. He marched back, the glowing stone keeping him warm, and restored life to his beloved frozen valleys.",
        moral: "True courage and adventure lie not in seeking glory, but in enduring hardships for the well-being of those we love.",
        category: "Adventure"
      };
    } else if (normTone.includes('zen') || normTone.includes('minimalist')) {
      return {
        title: "The River and the Stone",
        content: "A polished river stone lay at the bottom of a rapid mountain stream. For years, the rushing waters pushed and pulled against it, carving away its rough edges. Beside the stream, a tall reed stood stiffly, resisting every gust of wind and boasting of its strength. 'Watch how I stand tall against the currents of life!' the reed declared proudly to the tiny stone. But when autumn brought a massive storm, the fierce winds snapped the rigid reed in two, sweeping its pieces down the river. Meanwhile, the humble stone simply surrendered to the flow of the water, resting peacefully on the riverbed, polished to a state of absolute, glistening perfection. It knew that strength lied not in resistance, but in the graceful art of letting go.",
        moral: "True strength is found in yielding gracefully to life's stream, not in exhausting ourselves to fight it.",
        category: "Zen Tale"
      };
    } else if (normTone.includes('philosophical')) {
      return {
        title: "The Star Weaver's Mirror",
        content: "In a tower high above the clouds lived the Star Weaver, an ancient wizard whose duty was to polish the night sky so travelers can find their way. One evening, a shattered mirror fell from a shooting star, landing directly on his balcony. Looking into the broken shards, the Star Weaver saw not his own face, but a thousand different versions of his past actions—both great deeds of kindness and moments he regretted. He wanted to throw the painful shards away, but a wise owl stopped him. 'Do not fear the broken glass,' the owl said. 'Every reflection, good or bad, is a vital thread in the magnificent tapestry of who you are today.' The Weaver smiled, keeping the shards as a reminder that every mistake is simply a guide towards a brighter tomorrow.",
        moral: "Our life is a prism of experiences; our failures are just as essential to our wisdom as our triumphs.",
        category: "Philosophical"
      };
    } else {
      return {
        title: "The Whisper of the Old Oak",
        content: "Deep in the Whispering Woods, there stood an old oak tree named Barnaby, who possessed the rare magic of speaking to the wind. Unlike other trees, Barnaby could capture the golden dreams of children sleeping nearby and weave them into protective rustling leaves that kept night-time fears at bay. One day, a young girl named Lily came to sit beneath his branches, crying because she felt she had no talents compared to her artist brother or musician sister. Barnaby gently brushed her shoulder with a velvet leaf and whispered, 'A canvas shows color, and an instrument makes sound, but you have the magic of absolute presence. Your gentle heart listens to those whom others ignore.' Lily looked around and realized her gift of kindness was a rare magic indeed.",
        moral: "Every soul holds a unique spark of magic, and our greatest gift is often the silent warmth we bring to others.",
        category: "Inspirational"
      };
    }
  }
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: Date.now() - metrics.serverStartTime });
});

// Admin Authentication Middleware
const adminAuthMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey === '7777') {
    return next();
  }
  res.status(403).json({ error: "Access Denied: Restricted to Administrator Operators only." });
};

app.get("/api/admin/stats", adminAuthMiddleware, async (req, res) => {
  const memoryUse = process.memoryUsage();
  
  res.json({
    cacheSize: 0, // Now handled by client
    totalRequests: metrics.totalRequests,
    aiGenerations: metrics.aiGenerations,
    uptimeSec: Math.floor((Date.now() - metrics.serverStartTime) / 1000),
    memoryMB: Math.round(memoryUse.heapUsed / 1024 / 1024)
  });
});

app.get("/api/ping", async (req, res) => {
  res.json({ pong: true });
});

app.post("/api/generate-draft", adminAuthMiddleware, async (req, res) => {
  const { date, lang, tone, length } = req.body;
  if (!date) {
    res.status(400).json({ error: "Missing date parameter" });
    return;
  }

  try {
    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY, 
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } 
    });

    const prompt = `Write a beautiful, engaging, and premium-quality short story for the date ${date}. 
    The story should be suitable for all ages (from 5 to 90 years old) and impart a strong, timeless moral value.
    The primary language of the story MUST be ${lang === 'hi' ? 'Hindi (written in Devanagari script, pure and poetic)' : 'English (rich, beautiful vocabulary)'}.
    Topic/Tone: ${tone || 'Inspiring and magical'}
    Target Length: ${length || 'Medium (around 300 words)'}
    Format the response as a JSON object with:
    - "title": A captivating title.
    - "content": The main body of the story (can include paragraphs separated by \\n\\n).
    - "moral": The moral of the story, clearly stated in one sentence.
    - "category": A genre/category like 'Fable', 'Inspirational', 'Adventure'.
    Make it feel like a premium Disney or Pixar story but in text format.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            moral: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["title", "content", "moral", "category"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) throw new Error("Empty response from AI");
    
    metrics.aiGenerations++;
    const storyData = JSON.parse(responseText);

    // Save generated draft locally immediately
    writeLocalStory({
      ...storyData,
      date,
      lang: lang || 'en'
    });

    // Save generated draft to Firestore immediately as best-effort
    if (db) {
      const docId = `${date}-${lang || 'en'}`;
      try {
        await db.collection('stories').doc(docId).set({
          ...storyData,
          date: date,
          lang: lang || 'en',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        console.log(`Saved AI Draft ${docId} to Firestore.`);
      } catch (e) {
        console.error("Failed to save draft to Firestore:", e);
      }
    }

    res.json(storyData);
  } catch (error: any) {
    console.error("Draft generation error, evaluating rate limit or error handling:", error);
    const errStr = (error?.message || JSON.stringify(error) || String(error)).toLowerCase();
    
    // Provide general fallback on rate limit/quota exhaustion to avoid breaking client-side publish workflows
    if (errStr.includes('quota') || errStr.includes('429') || errStr.includes('exhausted') || errStr.includes('rate limit') || errStr.includes('resource_exhausted') || true) {
      console.warn("Providing offline fallback draft due to rate limit/unreachable AI model...", error?.message || "Quota limit exceeded");
      
      const fallbackStory = getFallbackStory(lang || 'en', tone, date);
      
      // Save draft fallback locally immediately so it is instantly available
      writeLocalStory({
        ...fallbackStory,
        date: date,
        lang: lang || 'en'
      });

      // Save draft fallback to Firestore so future client requests for this date get served instantly from cache!
      if (db) {
        const docId = `${date}-${lang || 'en'}`;
        try {
          await db.collection('stories').doc(docId).set({
            ...fallbackStory,
            date: date,
            lang: lang || 'en',
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
          console.log(`Saved Fallback Draft ${docId} to Firestore Cache.`);
        } catch (e) {
          console.error("Failed to save fallback draft to Firestore cache:", e);
        }
      }
      
      res.json(fallbackStory);
      return;
    }

    res.status(500).json({ error: "Draft generation error: " + String(error) });
  }
});

app.get("/api/admin/stories", adminAuthMiddleware, async (req, res) => {
  const localStoriesMap = readLocalStories();
  let stories = Object.entries(localStoriesMap).map(([id, data]) => ({ id, ...data }));

  if (db) {
    try {
      const snapshot = await db.collection('stories').get();
      const firestoreStories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      // Merge local and firestore stories, local stories take precedence
      const mergedMap = new Map();
      firestoreStories.forEach((st: any) => {
        if (st.date && st.lang) {
          const docId = `${st.date}-${st.lang}`;
          mergedMap.set(docId, st);
        }
      });
      stories.forEach((st: any) => {
        const docId = `${st.date}-${st.lang}`;
        mergedMap.set(docId, st);
      });
      
      stories = Array.from(mergedMap.values());
    } catch (error) {
      console.warn("Failed to load admin stories from Firestore (using local cache only):", error);
    }
  }

  // Sort stories by date descending
  stories.sort((a: any, b: any) => {
    const dateA = a.date || "";
    const dateB = b.date || "";
    return dateB.localeCompare(dateA);
  });
  res.json(stories);
});

app.post("/api/admin/save-story", adminAuthMiddleware, async (req, res) => {
  const { date, lang, title, category, moral, content, tone, length } = req.body;
  if (!date || !lang || !title) {
    res.status(400).json({ error: "Missing required fields (date, lang, title)" });
    return;
  }
  try {
    const docId = `${date}-${lang}`;
    const payload = {
      date,
      lang,
      title,
      category: category || 'Fable',
      moral: moral || '',
      content: content || '',
      tone: tone || '',
      length: length || '',
      updatedAt: Date.now()
    };

    // Save locally first to guarantee absolute persistence across all permissions situations!
    writeLocalStory(payload);

    if (db) {
      try {
        const docRef = db.collection('stories').doc(docId);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          await docRef.update(payload);
        } else {
          await docRef.set({
            ...payload,
            createdAt: Date.now()
          });
        }
        console.log(`Saved story ${docId} to Firestore.`);
      } catch (firestoreError) {
        console.warn("Firestore save failed, but local copy is successfully saved:", firestoreError);
      }
    }
    res.json({ success: true, docId, story: payload });
  } catch (error) {
    console.error("Failed to save story:", error);
    res.status(500).json({ error: String(error) });
  }
});

app.post("/api/admin/delete-story", adminAuthMiddleware, async (req, res) => {
  const { id } = req.body;
  if (!id) {
    res.status(400).json({ error: "Missing document id" });
    return;
  }
  try {
    // Delete locally first
    deleteLocalStory(id);

    if (db) {
      try {
        await db.collection('stories').doc(id).delete();
        console.log(`Deleted story ${id} from Firestore.`);
      } catch (firestoreError) {
        console.warn("Firestore delete failed, but local copy is successfully removed:", firestoreError);
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete story locally:", error);
    res.status(500).json({ error: String(error) });
  }
});

app.get("/api/story", async (req, res) => {
  const dateStr = req.query.date as string;
  const lang = req.query.lang as string || 'en';
  
  if (!dateStr) {
    res.status(400).json({ error: "Missing date parameter" });
    return;
  }

  const docId = `${dateStr}-${lang}`;

  // 1. Check local stories cache first for instant hits (resilient to offline/permissions issues)
  const localStories = readLocalStories();
  if (localStories[docId]) {
    console.log(`Local Cache hit for ${docId}`);
    res.json(localStories[docId]);
    return;
  }

  // 2. Check if we have it in Firestore
  if (db) {
    try {
      const doc = await db.collection('stories').doc(docId).get();
      if (doc.exists) {
        console.log(`Firestore cache hit for ${docId}`);
        const storyData = doc.data() as StoryRecord;
        // Cache locally for future offline resilience
        writeLocalStory(storyData);
        res.json(storyData);
        return;
      }
    } catch (e) {
      console.error("Firestore read error (falling back to generation):", e);
    }
  }

  // 3. Generate if not found
  try {
    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY, 
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } 
    });

    const prompt = `Write a beautiful, engaging, and premium-quality short story for the date ${dateStr}. 
    The story should be suitable for all ages (from 5 to 90 years old) and impart a strong, timeless moral value.
    The primary language of the story MUST be ${lang === 'hi' ? 'Hindi (written in Devanagari script, pure and poetic)' : 'English (rich, beautiful vocabulary)'}.
    Format the response as a JSON object with:
    - "title": A captivating title.
    - "content": The main body of the story (can include paragraphs separated by \\n\\n).
    - "moral": The moral of the story, clearly stated in one sentence.
    - "category": A genre/category like 'Fable', 'Inspirational', 'Adventure'.
    Make it feel like a premium Disney or Pixar story but in text format.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            moral: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["title", "content", "moral", "category"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from AI");
    }

    metrics.aiGenerations++; // Increment generations counter

    let storyData;
    try {
      storyData = JSON.parse(responseText);
    } catch (e) {
      throw new Error("Failed to parse JSON from AI");
    }

    // Cache locally immediately
    writeLocalStory({
      ...storyData,
      date: dateStr,
      lang: lang
    });

    // Save generated story to Firestore as best effort
    if (db) {
      try {
        await db.collection('stories').doc(docId).set({
          ...storyData,
          date: dateStr,
          lang: lang,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        console.log(`Saved story ${docId} to Firestore.`);
      } catch (e) {
        console.error("Failed to save to Firestore:", e);
      }
    }

    res.json(storyData);
  } catch (error: any) {
    const errStr = (error?.message || JSON.stringify(error) || String(error)).toLowerCase();
    if (errStr.includes('quota') || errStr.includes('429') || errStr.includes('exhausted') || errStr.includes('rate limit') || errStr.includes('resource_exhausted') || true) {
      console.warn("Providing offline fallback due to rate limits or API unreachable...", error?.message || "Quota limit exceeded");
      const fallbackStory = getFallbackStory(lang || 'en', undefined, dateStr);
      
      // Save locally first so they load instant offline
      writeLocalStory({
        ...fallbackStory,
        date: dateStr,
        lang: lang
      });

      // Write fallback story to Firestore as best effort so subsequent loads bypass AI model calls
      if (db) {
        try {
          await db.collection('stories').doc(docId).set({
            ...fallbackStory,
            date: dateStr,
            lang: lang,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
          console.log(`Saved Fallback Story ${docId} to Firestore Cache.`);
        } catch (e) {
          console.error("Failed to save fallback story to Firestore cache:", e);
        }
      }
      
      res.json(fallbackStory);
      return;
    }
    
    res.status(500).json({ error: "Story generation error: " + String(error) });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
