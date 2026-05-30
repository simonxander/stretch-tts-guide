// 預設伸展流程與動作資料表 (繁體中文版)
export const DEFAULT_ROUTINES = [
  {
    id: 'desk-relief',
    name: '上班族肩頸放鬆',
    theme: 'sage',
    description:
      '針對長時間坐在電腦前的上班族所設計。幫助緩解頸部、肩部和上背部因靜止不動而累積的緊繃與酸痛。',
    durationText: '2.5 分鐘',
    steps: [
      {
        id: 'neck-tilt',
        name: '頸部側向伸展',
        duration: 20,
        animationType: 'neck-tilt',
        instructions: [
          '坐正或站直，雙肩自然放鬆下沉。',
          '慢慢將右耳向右肩膀靠近。',
          '停留 10 秒鐘，接著換左側伸展。',
          '請勿過度拉扯，讓頭部的重量自然垂下即可。',
        ],
        ttsCues: [
          { time: 0, text: '首先是頸部側向伸展。慢慢將右耳向右肩靠近。保持左肩自然放鬆下沉。' },
          { time: 10, text: '現在換邊。慢慢將頭部向左傾斜，感受右側頸部肌肉的延伸與放鬆。' },
          { time: 20, text: '慢慢回正。' },
        ],
      },
      {
        id: 'shoulder-roll',
        name: '肩部繞環',
        duration: 20,
        animationType: 'shoulder-roll',
        instructions: [
          '吸氣，將雙肩向上抬起移向耳朵。',
          '吐氣，將雙肩向後向下滾動放鬆。',
          '保持緩慢且順暢的圓周繞環動作。',
          '時間過半時換方向繞環。',
        ],
        ttsCues: [
          { time: 0, text: '肩部繞環。雙肩由前向上、向後繞環。保持深沉有規律的呼吸。' },
          { time: 10, text: '現在反方向。雙肩由後向上、向前滾動，帶走肩膀的疲勞與緊繃。' },
          { time: 20, text: '結束動作。' },
        ],
      },
      {
        id: 'chest-opener',
        name: '站立擴胸伸展',
        duration: 30,
        animationType: 'chest-opener',
        instructions: [
          '將雙手置於背後，十指互扣。',
          '雙臂微微伸直，慢慢向後拉並將胸口提起。',
          '如果頸部感到舒適，可微微仰頭看向斜上方。',
          '保持深長呼吸，感覺呼吸擴張您的胸腔。',
        ],
        ttsCues: [
          {
            time: 0,
            text: '現在是站立擴胸。雙手在背後十指互扣，微微伸直雙臂，將胸口向上提起，微微抬起下巴。',
          },
          { time: 15, text: '時間過半。吸氣時感覺胸腔前側完全擴張，吐氣時肩膀進一步放鬆。' },
          { time: 30, text: '雙手慢慢解開。' },
        ],
      },
      {
        id: 'side-stretch',
        name: '站立體側伸展',
        duration: 30,
        animationType: 'side-stretch',
        instructions: [
          '將右手臂高舉過頭伸直。',
          '上半身徐徐向左側傾斜，延展身體右側。',
          '停留 15 秒後，換左側體側伸展。',
          '雙腳踩穩地面，重心平均分布在兩腳上。',
        ],
        ttsCues: [
          {
            time: 0,
            text: '進行體側伸展。將右手臂高舉過頭，上半身向左傾斜，深呼吸並感受右側肋骨與腰側的延展。',
          },
          { time: 15, text: '現在換邊。換左手臂高舉過頭，身體向右側傾斜。放鬆頸部。' },
          { time: 30, text: '身體慢慢回正。' },
        ],
      },
      {
        id: 'forward-fold',
        name: '站立前彎伸展',
        duration: 30,
        animationType: 'forward-fold',
        instructions: [
          '雙腳打開與髖同寬站立，膝蓋微彎保持彈性。',
          '從髖部開始慢慢向前折疊，讓上半身如瀑布般自然垂下。',
          '讓頭部與雙臂完全放鬆，沉向地面。',
          '將呼吸帶到大腿後側以及整個下背部。',
        ],
        ttsCues: [
          {
            time: 0,
            text: '最後一個動作，站立前彎。從髖部對折前彎，讓頭部與雙臂放鬆垂下。膝蓋記得保持微彎。',
          },
          { time: 15, text: '讓地心引力自然拉伸並放鬆脊椎。在這裡享受平靜的幾次呼吸。' },
          { time: 30, text: '吸氣，從尾椎開始，慢慢捲脊站立回正。' },
        ],
      },
    ],
  },
  {
    id: 'bedtime-yoga',
    name: '睡前放鬆伸展',
    theme: 'lavender',
    description:
      '結合深呼吸與緩慢的肌肉拉伸，引導大腦與身體釋放整天累積的壓力，為 restful 睡眠做好準備。',
    durationText: '2 分鐘',
    steps: [
      {
        id: 'chest-opener',
        name: '溫和開背',
        duration: 30,
        animationType: 'chest-opener',
        instructions: [
          '採取舒適的坐姿，雙手輕放在膝蓋上。',
          '吸氣，將胸口向前托出並向上提。',
          '吐氣，讓背部回歸中立並放鬆。配合呼吸反覆緩慢進行。',
        ],
        ttsCues: [
          {
            time: 0,
            text: '歡迎來到睡前放鬆伸展。首先是溫和開背。吸氣並將胸腔向前向上提起，溫和延展脊椎。',
          },
          { time: 15, text: '配合您的呼吸節奏。吸氣胸腔擴張，吐氣時放鬆，沉澱思緒。' },
          { time: 30, text: '放鬆。' },
        ],
      },
      {
        id: 'forward-fold',
        name: '坐姿前彎伸展',
        duration: 45,
        animationType: 'forward-fold',
        instructions: [
          '將雙腿舒適盤坐或向前伸直。',
          '雙手徐徐向前走，讓脊椎自然微微拱起折疊。',
          '低頭讓下巴靠近胸口，徹底放鬆後頸。',
          '專注在每一次長且緩慢的呼氣上。',
        ],
        ttsCues: [
          { time: 0, text: '接著是坐姿前彎。雙手慢慢向前延伸，讓額頭與頸部自然放鬆垂下。' },
          { time: 20, text: '專注在延長吐氣的時間。感受身體隨著吐氣放鬆，卸下一整天的負擔。' },
          { time: 45, text: '雙手推地，慢慢起身上身回正。' },
        ],
      },
      {
        id: 'neck-tilt',
        name: '正念頸部拉伸',
        duration: 30,
        animationType: 'neck-tilt',
        instructions: [
          '脊椎挺直，雙肩放鬆下沉。',
          '頭部向右傾斜，緩慢吸吐 15 秒。',
          '接著將頭部換向左傾斜 15 秒。',
        ],
        ttsCues: [
          { time: 0, text: '最後，我們來放鬆頸部。頭部慢慢向右傾斜。吸入平靜，吐出緊繃。' },
          {
            time: 15,
            text: '現在慢慢將頭部換向左側。感覺肩膀和頸部的肌群正在逐漸融化、舒展開來。',
          },
          { time: 30, text: '頭部慢慢回正。' },
        ],
      },
    ],
  },
];

const LOCAL_STORAGE_KEY = 'zenstretch_custom_routines';

// Helper: Get all routines (default + custom)
export function getAllRoutines() {
  const customRoutinesJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
  let customRoutines = [];

  if (customRoutinesJSON) {
    try {
      customRoutines = JSON.parse(customRoutinesJSON);
    } catch (e) {
      console.error('Error parsing custom routines from localStorage:', e);
    }
  }

  return [...DEFAULT_ROUTINES, ...customRoutines];
}

// Helper: Save a custom routine
export function saveCustomRoutine(routine) {
  const customRoutinesJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
  let customRoutines = [];

  if (customRoutinesJSON) {
    try {
      customRoutines = JSON.parse(customRoutinesJSON);
    } catch {
      customRoutines = [];
    }
  }

  // Clean routine fields and generate unique ID if needed
  const cleanedRoutine = {
    ...routine,
    id: routine.id || `custom-${Date.now()}`,
    isCustom: true,
  };

  // Replace if exists, else append
  const existingIdx = customRoutines.findIndex((r) => r.id === cleanedRoutine.id);
  if (existingIdx >= 0) {
    customRoutines[existingIdx] = cleanedRoutine;
  } else {
    customRoutines.push(cleanedRoutine);
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customRoutines));
  return cleanedRoutine;
}

// Helper: Delete a custom routine
export function deleteCustomRoutine(id) {
  const customRoutinesJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!customRoutinesJSON) return;

  try {
    let customRoutines = JSON.parse(customRoutinesJSON);
    customRoutines = customRoutines.filter((r) => r.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customRoutines));
  } catch (e) {
    console.error('Error deleting custom routine:', e);
  }
}

// Helper: Get a stable theme for a routine
export function getRoutineTheme(routine) {
  if (routine && routine.theme) {
    return routine.theme;
  }
  // Assign stable theme based on ID
  const themes = ['sage', 'clay', 'lavender', 'rose', 'gold', 'ocean'];
  const idStr = (routine && routine.id) || '';
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % themes.length;
  return themes[index];
}
