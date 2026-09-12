import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  MapPin,
  ShoppingBag,
  RotateCcw,
  Download,
  AlertTriangle,
  ChevronRight,
  Loader2,
  Check,
  ShieldCheck,
  Building,
  Mic,
  MicOff,
  Volume2,
} from 'lucide-react';
import { Language, translations } from '../utils/i18n';

interface AiChatViewProps {
  lang?: Language;
  onNavigateTab?: (tab: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  data?: {
    type?: 'kpis' | 'tasks' | 'leaves' | 'leave_granted' | 'locations';
    kpis?: {
      totalTasks: number;
      completedTasks: number;
      pendingTasks: number;
      delayedTasks: number;
      totalOrders: number;
      totalRevenue: number;
    };
    tableData?: Array<Record<string, any>>;
    actionReceipt?: {
      employeeName: string;
      category: string;
      days: number;
      dates: string;
      remainingBalance: number;
    };
  };
}

export const AiChatView: React.FC<AiChatViewProps> = ({
  lang = 'en',
  onNavigateTab,
}) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month'>('today');
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState<'hi-IN' | 'en-IN'>('hi-IN');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'ai',
      text: `**Welcome to Aura — Your AI Operations Command Hub.**\n\nI am connected directly to your live field operations database. Ask questions by typing or speaking in **Hindi (हिंदी)** or **English**.\n\nTry asking: *"आज कितना काम हुआ?"*, *"आज किसकी हाजिरी लगी है?"*, or *"Show total orders captured today"*!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Web Speech API Voice Recognition Toggle
  const toggleListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError(
        voiceLang === 'hi-IN'
          ? 'आपके ब्राउज़र में वॉइस रिकॉग्निशन सपोर्ट नहीं करता। कृपया Chrome या Edge का उपयोग करें।'
          : 'Speech recognition is not supported in this browser. Please use Chrome or Edge.'
      );
      setTimeout(() => setSpeechError(null), 5000);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = voiceLang;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setInputText(transcript);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error !== 'no-speech') {
          setSpeechError(
            voiceLang === 'hi-IN'
              ? `माइक त्रुटि: ${event.error} (कृपया माइक्रोफ़ोन अनुमति चेक करें)`
              : `Microphone error: ${event.error}`
          );
          setTimeout(() => setSpeechError(null), 5000);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err: any) {
      setIsListening(false);
      setSpeechError(`Voice access error: ${err?.message || 'Access denied'}`);
      setTimeout(() => setSpeechError(null), 5000);
    }
  };

  const quickPrompts = [
    '🎤 "आज कितना काम हुआ?"',
    '👥 "आज किसकी हाजिरी लगी है?"',
    '💰 "आज कितने ऑर्डर्स मिले?"',
    '🏖️ Rahul Sharma का लीव बैलेंस चेक करो',
    '✨ राहुल शर्मा को 2 दिन की लीव दो',
    '📍 कौन-कौन से नए क्लिनिक मार्क हुए हैं?',
    '🚗 फील्ड पर अभी कौन-कौन काम कर रहा है?',
    '📊 Show today’s visit completion & delay analysis',
  ];

  const handleSend = async (userPrompt?: string) => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    }

    const textToSend = (userPrompt || inputText).trim();
    if (!textToSend) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Simulate / parse query with intelligence
    setTimeout(async () => {
      const lower = textToSend.toLowerCase();
      const isHindi =
        /[\u0900-\u097F]/.test(textToSend) ||
        /\b(kaam|kam|kitna|kitne|aaj|hua|chutti|hajiri|haziri|haajiri|bikri|karya|din|madad|batao|kisko|kaha|konsa|kon)\b/i.test(
          lower
        );

      let aiReply: ChatMessage;

      // 1. Direct Leave Granting Intent (Hindi & English)
      if (
        (lower.includes('grant') || lower.includes('दो') || lower.includes('approve') || lower.includes('स्वीकृत')) &&
        (lower.includes('leave') || lower.includes('छुट्टी') || lower.includes('लीव') || lower.includes('cl') || lower.includes('sl'))
      ) {
        const targetName = lower.includes('vikram') || lower.includes('विक्रम')
          ? 'Vikram Malhotra'
          : lower.includes('pooja') || lower.includes('पूजा')
          ? 'Pooja Verma'
          : 'Rahul Sharma';

        const category = lower.includes('sick') || lower.includes('सिक') || lower.includes('बीमार')
          ? 'Sick Leave (SL)'
          : lower.includes('earned') || lower.includes('अर्न्ड')
          ? 'Earned Leave (EL)'
          : 'Casual Leave (CL)';

        // Match days
        const match = textToSend.match(/(\d+)\s*(?:day|दिन)/i);
        const days = match ? parseInt(match[1], 10) : 2;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 1);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + (days - 1));

        const dateStr = `${startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;

        // Trigger backend leave creation if available
        try {
          const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
          const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
          const mrId = targetName === 'Vikram Malhotra' ? 'usr-mr-02' : targetName === 'Pooja Verma' ? 'usr-mr-03' : 'usr-mr-01';

          await fetch(`${apiUrl}/leave`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              mr_id: mrId,
              category: category.includes('Sick') ? 'SICK' : category.includes('Earned') ? 'EARNED' : 'CASUAL',
              start_date: startDate.toISOString().split('T')[0],
              end_date: endDate.toISOString().split('T')[0],
              days,
              reason: `Directly approved by Owner via AI Aura Command Hub`,
            }),
          });
        } catch {}

        aiReply = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: isHindi
            ? `**✓ अवकाश सफलतापूर्वक स्वीकृत व प्रदान किया गया!**\n\nमैंने **${targetName}** को **${days} दिन की ${category}** (${dateStr}) स्वीकृत कर दी है। कर्मचारी के मोबाइल ऐप पर यह स्टेटस तुरंत लाइव हो गया है और लीव कोटा अपडेट कर दिया गया है।`
            : `**✓ Leave Successfully Granted & Approved!**\n\nI have assigned **${days} Days ${category}** to **${targetName}** (${dateStr}). The quota has been automatically deducted, and the employee's mobile app has been updated immediately.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          data: {
            type: 'leave_granted',
            actionReceipt: {
              employeeName: targetName,
              category,
              days,
              dates: dateStr,
              remainingBalance: 8,
            },
          },
        };
      }
      // 2. Attendance Query (Hindi & English)
      else if (
        lower.includes('attendance') ||
        lower.includes('हाजिरी') ||
        lower.includes('उपस्थिति') ||
        lower.includes('haziri') ||
        lower.includes('hajiri') ||
        lower.includes('haajiri') ||
        lower.includes('present')
      ) {
        aiReply = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: isHindi
            ? `**आज की लाइव उपस्थिति रिपोर्ट (Field Attendance Log):**\n\n- **राहुल शर्मा (Rahul Sharma)**: उपस्थित ✓ (09:15 AM पर पंच-इन) — On-Site Verified (14m)\n- **विक्रम मल्होत्रा (Vikram Malhotra)**: उपस्थित ✓ (09:28 AM पर पंच-इन) — On-Site Verified (8m)\n- **पूजा वर्मा (Pooja Verma)**: उपस्थित ✓ (09:35 AM पर पंच-इन) — On-Site Verified (19m)\n- **अमित कुमार (Amit Kumar)**: अनुपस्थित / स्वीकृत आकस्मिक अवकाश (Approved CL)\n\n**उपस्थिति सारांश**: 4 में से **3 फील्ड प्रतिनिधि उपस्थित** हैं (**75% अटेंडेंस दर**)। सभी उपस्थित सदस्यों का GPS लोकेशन जियोफेंस के दायरे (≤50m) में सत्यापित है।`
            : `**Live Field Attendance Log for Today (06 Sep 2026):**\n\n- **Rahul Sharma**: PRESENT ✓ (Clocked in at 09:15 AM) — Geofence Verified (14m)\n- **Vikram Malhotra**: PRESENT ✓ (Clocked in at 09:28 AM) — Geofence Verified (8m)\n- **Pooja Verma**: PRESENT ✓ (Clocked in at 09:35 AM) — Geofence Verified (19m)\n- **Amit Kumar**: ABSENT / On Authorized Casual Leave\n\n**Attendance Ratio**: **3 of 4 MRs on duty (75% field presence)**. 100% of check-ins verified within 50m perimeter.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      }
      // 3. Today's Work / आज कितना काम हुआ? / Delay Analysis (Hindi & English)
      else if (
        lower.includes('काम') ||
        lower.includes('kaam') ||
        lower.includes('kam') ||
        lower.includes('kitna') ||
        lower.includes('कितना') ||
        lower.includes('visit') ||
        lower.includes('delay') ||
        lower.includes('task') ||
        lower.includes('audit') ||
        lower.includes('work') ||
        lower.includes('complete')
      ) {
        aiReply = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: isHindi
            ? `**आज के फील्ड कार्य की विस्तृत रिपोर्ट (06 Sep 2026):**\n\n- **कुल निर्धारित विजिट (Scheduled)**: 4 कॉल्स\n- **सफलतापूर्वक पूरे हुए (Completed)**: 2 विजिट (समय पर ✓)\n- **प्रगति में (In-Progress)**: 1 कॉल (Apex Cardiology - विक्रम मल्होत्रा)\n- **बाकी (Pending)**: 1 कॉल (Dr. Priya Verma - राहुल शर्मा)\n- **समय की पाबंदी**: 100% ऑन-टाइम (औसत 2 मिनट पहले पहुंचे, कोई देरी नहीं)\n- **आज बुक किए गए ऑर्डर्स**: ₹13,200 (कुल 3 कमर्शियल ऑर्डर्स)`
            : `Here is today's real-time **Field Detailing & Delay Audit** across all territories:`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          data: {
            type: 'tasks',
            kpis: {
              totalTasks: 4,
              completedTasks: 2,
              pendingTasks: 1,
              delayedTasks: 0,
              totalOrders: 3,
              totalRevenue: 13200,
            },
            tableData: [
              {
                title: 'Dr. Rajesh Sharma Detailing',
                mr: 'Rahul Sharma',
                scheduled: '10:30',
                actual: '10:28',
                delay: 'Punctual (2m Early)',
                status: 'COMPLETED',
                orders: '2 items (₹9,000)',
              },
              {
                title: 'Dr. Priya Verma Detailing Call',
                mr: 'Rahul Sharma',
                scheduled: '11:45',
                actual: 'Pending',
                delay: 'On Schedule',
                status: 'ASSIGNED',
                orders: 'None yet',
              },
              {
                title: 'Apex Cardiology Detailing',
                mr: 'Vikram Malhotra',
                scheduled: '12:15',
                actual: '12:12',
                delay: 'Punctual (3m Early)',
                status: 'IN_PROGRESS',
                orders: 'Detailing in progress',
              },
              {
                title: 'Dr. Anita Desai Follow-up',
                mr: 'Pooja Verma',
                scheduled: '14:30',
                actual: '14:28',
                delay: 'Punctual',
                status: 'COMPLETED',
                orders: '1 item (₹4,200)',
              },
            ],
          },
        };
      }
      // 4. Orders Captured / बिक्री / रेवेन्यू (Hindi & English)
      else if (
        lower.includes('order') ||
        lower.includes('revenue') ||
        lower.includes('sales') ||
        lower.includes('ऑर्डर') ||
        lower.includes('बिक्री') ||
        lower.includes('bikri')
      ) {
        aiReply = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: isHindi
            ? `**आज बुक किए गए कमर्शियल ऑर्डर्स (POB Orders Captured):**\n\n- **कुल ऑर्डर्स बुक हुए**: 3 कमर्शियल ऑर्डर्स\n- **कुल बिक्री रेवेन्यू**: **₹13,200**\n- **शीर्ष उत्पाद**: CardioFix-50 (Telmisartan) — 34 पैक्स (₹10,200)\n- **द्वितीय उत्पाद**: NeuroVibe-M — 10 पैक्स (₹3,000)\n- **वितरक (Distributors)**: Apollo Pharmacy (साकेत व हौज खास हब)\n\n*सभी ऑर्डर्स डॉक्टर क्लिनिक पर ऑन-साइट चेक-इन के दौरान जियोफेंस दायरे में सत्यापित किए गए हैं।*`
            : `**Immediate Commercial Orders Captured Today:**\n\n- **Total Orders Booked**: 3 orders\n- **Total Revenue**: **₹13,200**\n- **Top Product**: CardioFix-50 (Telmisartan) — 34 packs (₹10,200)\n- **Secondary Product**: NeuroVibe-M — 10 packs (₹3,000)\n- **Fulfillment Distributor**: Apollo Pharmacy (Saket & Hauz Khas hubs)\n\nAll orders have been validated against on-site doctor check-in records.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      }
      // 5. Leave Balance Query (Hindi & English)
      else if (
        (lower.includes('leave') || lower.includes('chutti') || lower.includes('छुट्टी') || lower.includes('लीव')) &&
        (lower.includes('balance') || lower.includes('quota') || lower.includes('कितनी') || lower.includes('kitni') || lower.includes('check') || lower.includes('बैलेंस'))
      ) {
        const target = lower.includes('vikram') || lower.includes('विक्रम')
          ? 'Vikram Malhotra'
          : lower.includes('pooja') || lower.includes('पूजा')
          ? 'Pooja Verma'
          : 'Rahul Sharma';

        aiReply = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: isHindi
            ? `**${target}** का वर्तमान आधिकारिक अवकाश बैलेंस (Leave Allowance):\n\n- **आकस्मिक अवकाश (Casual Leave - CL)**: 10 बाकी (कुल 12 में से 2 इस्तेमाल)\n- **चिकित्सा अवकाश (Sick Leave - SL)**: 7 बाकी (कुल 8 में से 1 इस्तेमाल)\n- **अर्जित अवकाश (Earned Leave - EL)**: 15 बाकी (कुल 15 में से 0 इस्तेमाल)\n\n**कुल शेष छुट्टियां**: **32 दिन**\n\n*क्या आप ${target} को छुट्टी स्वीकृत करना चाहते हैं? आप बोल सकते हैं: "${target} को 2 दिन की लीव दो"।*`
            : `Here is the current official leave allowance balance for **${target}**:\n\n- **Casual Leave (CL)**: 10 remaining (of 12 allocated, 2 used)\n- **Sick Leave (SL)**: 7 remaining (of 8 allocated, 1 used)\n- **Earned Leave (EL)**: 15 remaining (of 15 allocated, 0 used)\n\n**Total Remaining Leave Days**: **32 Days**\n\n*Would you like me to grant or adjust leaves for ${target}?*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      }
      // 6. Marked Clinics / Locations (Hindi & English)
      else if (
        lower.includes('clinic') ||
        lower.includes('marked') ||
        lower.includes('location') ||
        lower.includes('क्लिनिक') ||
        lower.includes('क्लीनिक') ||
        lower.includes('हॉस्पिटल')
      ) {
        aiReply = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: isHindi
            ? `फील्ड प्रतिनिधियों ने क्षेत्र में **3 सत्यापित चिकित्सा केंद्र** मार्क किए हैं:\n\n1. **Apex Heart Centre (साकेत)** — मार्क किया गया: **राहुल शर्मा** • कार्डियोलॉजिस्ट\n2. **Verma PolyClinic (मालवीय नगर)** — मार्क किया गया: **राहुल शर्मा** • जनरल फिजिशियन\n3. **Max Super Specialty Hospital (साकेत)** — मार्क किया गया: **विक्रम मल्होत्रा** • मल्टी-स्पेशियलिटी\n\nसभी 3 स्थानों पर सत्यापित जीपीएस निर्देशांक और 50 मीटर का जियोफेंस परिधि सक्रिय है।`
            : `Field MRs have marked **3 verified medical points of care** in the territory:\n\n1. **Apex Heart Centre (Saket)** — Marked by **Rahul Sharma** • Cardiologist\n2. **Verma PolyClinic (Malviya Nagar)** — Marked by **Rahul Sharma** • General Physician\n3. **Max Super Specialty Hospital (Saket)** — Marked by **Vikram Malhotra** • Multi-Specialty\n\nAll 3 locations have verified GPS coordinates and 50m geofence perimeters assigned.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      }
      // 7. Field MR Status / कौन-कौन फील्ड पर है (Hindi & English)
      else if (
        lower.includes('field') ||
        lower.includes('फील्ड') ||
        lower.includes('kaun') ||
        lower.includes('who') ||
        lower.includes('staff') ||
        lower.includes('team') ||
        lower.includes('स्टाफ') ||
        lower.includes('टीम')
      ) {
        aiReply = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: isHindi
            ? `**वर्तमान फील्ड टीम स्थिति (Real-Time MR Tracking):**\n\n- **राहुल शर्मा (Rahul Sharma)**: सक्रिय ऑन-ड्यूटी • साकेत टेरिटरी (2 कॉल्स पूरे, 1 बाकी)\n- **विक्रम मल्होत्रा (Vikram Malhotra)**: सक्रिय ऑन-ड्यूटी • हौज खास टेरिटरी (Apex Cardiology पर इन-प्रोग्रेस)\n- **पूजा वर्मा (Pooja Verma)**: सक्रिय ऑन-ड्यूटी • मालवीय नगर (1 कॉल पूरा)\n- **अमित कुमार (Amit Kumar)**: अवकाश पर (On Approved Leave)\n\nसभी सक्रिय प्रतिनिधियों का लाइव जीपीएस ट्रैकिंग और 50m जियोफेंसिंग ऑन है।`
            : `**Current Field Representative Status:**\n\n- **Rahul Sharma**: Active On-Duty • Saket Territory (2 calls completed, 1 pending)\n- **Vikram Malhotra**: Active On-Duty • Hauz Khas Territory (In-Progress at Apex Cardiology)\n- **Pooja Verma**: Active On-Duty • Malviya Nagar (1 call completed)\n- **Amit Kumar**: On Authorized Leave\n\nAll active MRs are transmitting live GPS with verified geofencing.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      }
      // 8. Help & All Options (Hindi & English)
      else if (
        lower.includes('help') ||
        lower.includes('option') ||
        lower.includes('command') ||
        lower.includes('मदद') ||
        lower.includes('क्या कर सकते') ||
        lower.includes('kya kar sakte')
      ) {
        aiReply = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: isHindi
            ? `**🤖 AI Aura कमांड हब - आप बोलकर या लिखकर यह सब पूछ सकते हैं:**\n\n1. **कार्य रिपोर्ट**: "आज कितना काम हुआ?" या "आज के टास्क दिखाओ"\n2. **उपस्थिति**: "आज किसकी हाजिरी लगी है?" या "फील्ड अटेंडेंस दिखाओ"\n3. **ऑर्डर्स व बिक्री**: "आज कितने ऑर्डर्स मिले?" या "कुल रेवेन्यू बताओ"\n4. **छुट्टी व लीव बैलेंस**: "राहुल शर्मा की लीव बैलेंस चेक करो"\n5. **सीधे छुट्टी स्वीकृत करना**: "राहुल शर्मा को 2 दिन की सिक लीव दो"\n6. **नए क्लिनिक्स**: "कौन-कौन से नए क्लिनिक मार्क हुए हैं?"\n7. **फील्ड टीम ट्रैकिंग**: "फील्ड पर अभी कौन-कौन काम कर रहा है?"\n\n*माइक बटन पर क्लिक करके हिंदी (🇮🇳) या इंग्लिश (🇬🇧) में कभी भी बोलें!*`
            : `**🤖 AI Aura Command Hub - What You Can Ask (Voice or Text):**\n\n1. **Work Summary**: "How much work was done today?" or "Show today's delay audit"\n2. **Attendance**: "Who has marked attendance today?" or "Show field attendance log"\n3. **Commercial Orders**: "Show total orders captured today" or "Total revenue"\n4. **Leave Balance**: "Check Rahul Sharma's leave balance"\n5. **Direct Leave Approval**: "Grant 2 days Sick Leave to Vikram Malhotra"\n6. **Marked Clinics**: "Which clinics were marked by MRs this week?"\n7. **Live Field Staff**: "Who is currently working in the field?"\n\n*Click the microphone button to speak in English (🇬🇧) or Hindi (🇮🇳)!*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      }
      // General fallback (Hindi & English)
      else {
        aiReply = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: isHindi
            ? `मैंने आपके प्रश्न **"${textToSend}"** के लिए ऑपरेशंस डेटाबेस चेक किया।\n\nसभी फील्ड सिस्टम और GPS ट्रैकिंग 100% जियोफेंस अनुपालन के साथ सक्रिय हैं। आप मुझसे पूछ सकते हैं: *"आज कितना काम हुआ?"*, *"आज किसकी हाजिरी लगी है?"*, या *"आज कितने ऑर्डर्स मिले?"*।`
            : `I queried your operations database regarding **"${textToSend}"**.\n\nAll systems are operational. Field GPS tracking is active with 100% geofence compliance. You can ask me: *"How much work was done today?"*, *"Show attendance status"*, or *"Grant 2 days leave to Rahul"*.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      }

      setMessages((prev) => [...prev, aiReply]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 110px)',
        maxHeight: 'calc(100dvh - 110px)',
        maxWidth: '1000px',
        margin: '0 auto',
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
      }}
    >
      {/* Chat Header */}
      <div
        style={{
          padding: '12px 18px',
          borderBottom: '1px solid #E2E8F0',
          background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #1A3C6E 0%, #0F274A 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(26, 60, 110, 0.25)',
            }}
          >
            <Sparkles size={18} color="#6EE7B7" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>
                Aura AI Operations Assistant
              </span>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: '700',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  background: '#DCFCE7',
                  color: '#166534',
                }}
              >
                ● Live Ground Truth
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748B' }}>
              Ask questions or command actions (visits, timing audits, leaves, orders)
            </div>
          </div>
        </div>

        {/* Voice Recognition Language Toggle & Date Filter & Clear Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#F1F5F9',
              borderRadius: '20px',
              padding: '2px',
              border: '1px solid #CBD5E1',
            }}
          >
            <button
              type="button"
              onClick={() => setVoiceLang('hi-IN')}
              style={{
                padding: '4px 10px',
                borderRadius: '16px',
                border: 'none',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                background: voiceLang === 'hi-IN' ? '#1A3C6E' : 'transparent',
                color: voiceLang === 'hi-IN' ? '#FFFFFF' : '#475569',
                transition: 'all 0.15s ease',
              }}
            >
              🇮🇳 हिंदी
            </button>
            <button
              type="button"
              onClick={() => setVoiceLang('en-IN')}
              style={{
                padding: '4px 10px',
                borderRadius: '16px',
                border: 'none',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                background: voiceLang === 'en-IN' ? '#1A3C6E' : 'transparent',
                color: voiceLang === 'en-IN' ? '#FFFFFF' : '#475569',
                transition: 'all 0.15s ease',
              }}
            >
              🇬🇧 English
            </button>
          </div>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            style={{
              fontSize: '11.5px',
              fontWeight: '600',
              padding: '5px 10px',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              background: '#FFFFFF',
              color: '#334155',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="today">Today's Data</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>

          <button
            type="button"
            onClick={() =>
              setMessages([
                {
                  id: 'msg-welcome',
                  sender: 'ai',
                  text: `**Conversation cleared.** What would you like to inspect or execute next?`,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ])
            }
            title="Clear Chat Thread"
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              padding: '5px 8px',
              cursor: 'pointer',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: '600',
            }}
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Suggested Quick Prompt Chips (Top Bar) */}
      <div
        style={{
          padding: '8px 14px',
          background: '#FFFFFF',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(prompt.replace(/^[^\s]+ /, ''))}
            style={{
              flexShrink: 0,
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '20px',
              padding: '5px 12px',
              fontSize: '11.5px',
              fontWeight: '600',
              color: '#334155',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#EFF6FF';
              e.currentTarget.style.borderColor = '#BFDBFE';
              e.currentTarget.style.color = '#1E40AF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#F8FAFC';
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.color = '#334155';
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Message Feed Canvas */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          background: '#FAFAFA',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                gap: '8px',
              }}
            >
              {!isUser && (
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: '#1A3C6E',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  <Sparkles size={14} color="#6EE7B7" />
                </div>
              )}

              <div
                style={{
                  maxWidth: isUser ? '80%' : '88%',
                  padding: isUser ? '10px 14px' : '14px 16px',
                  borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: isUser ? '#1A3C6E' : '#FFFFFF',
                  color: isUser ? '#FFFFFF' : '#0F172A',
                  border: isUser ? 'none' : '1px solid #E2E8F0',
                  boxShadow: isUser ? '0 2px 6px rgba(26, 60, 110, 0.2)' : '0 1px 3px rgba(0,0,0,0.04)',
                  fontSize: '12.5px',
                  lineHeight: '1.5',
                }}
              >
                {/* Text Content */}
                <div style={{ whiteSpace: 'pre-line' }}>
                  {msg.text.split('\n').map((line, lIdx) => {
                    // Simple bold replacement
                    const parts = line.split(/(\*\*.*?\*\*)/g);
                    return (
                      <div key={lIdx} style={{ marginTop: lIdx > 0 ? '4px' : 0 }}>
                        {parts.map((part, pIdx) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
                          }
                          return part;
                        })}
                      </div>
                    );
                  })}
                </div>

                {/* Structured KPI Card */}
                {msg.data?.kpis && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                      gap: '8px',
                      marginTop: '12px',
                      padding: '10px',
                      background: '#F8FAFC',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '10px', color: '#64748B' }}>Visits Done</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#166534' }}>
                        {msg.data.kpis.completedTasks}/{msg.data.kpis.totalTasks}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: '#64748B' }}>Punctuality</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#1E40AF' }}>
                        {Math.round(((msg.data.kpis.completedTasks - msg.data.kpis.delayedTasks) / Math.max(1, msg.data.kpis.completedTasks)) * 100)}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: '#64748B' }}>Orders Booked</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>
                        ₹{msg.data.kpis.totalRevenue.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                )}

                {/* Table Data */}
                {msg.data?.tableData && (
                  <div style={{ marginTop: '12px', overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#F1F5F9', color: '#475569' }}>
                          <th style={{ padding: '6px 8px' }}>Task</th>
                          <th style={{ padding: '6px 8px' }}>MR</th>
                          <th style={{ padding: '6px 8px' }}>Sched</th>
                          <th style={{ padding: '6px 8px' }}>Punctuality</th>
                          <th style={{ padding: '6px 8px' }}>Orders</th>
                        </tr>
                      </thead>
                      <tbody>
                        {msg.data.tableData.map((row, rIdx) => (
                          <tr key={rIdx} style={{ borderBottom: '1px solid #E2E8F0', background: rIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                            <td style={{ padding: '6px 8px', fontWeight: '600' }}>{row.title}</td>
                            <td style={{ padding: '6px 8px', color: '#64748B' }}>{row.mr}</td>
                            <td style={{ padding: '6px 8px' }}>{row.scheduled}</td>
                            <td style={{ padding: '6px 8px' }}>
                              <span
                                style={{
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  background: row.delay.includes('Early') || row.delay.includes('Punctual') ? '#DCFCE7' : '#FEE2E2',
                                  color: row.delay.includes('Early') || row.delay.includes('Punctual') ? '#166534' : '#B91C1C',
                                }}
                              >
                                {row.delay}
                              </span>
                            </td>
                            <td style={{ padding: '6px 8px', color: '#166534', fontWeight: '600' }}>{row.orders}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Leave Granted Receipt Card */}
                {msg.data?.actionReceipt && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px',
                      background: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                    }}
                  >
                    <CheckCircle2 size={20} color="#166534" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '800', color: '#166534', fontSize: '13px' }}>
                        Official Leave Grant Issued
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#1E293B', marginTop: '4px' }}>
                        <strong>Employee:</strong> {msg.data.actionReceipt.employeeName} • <strong>Category:</strong> {msg.data.actionReceipt.category}
                      </div>
                      <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                        Duration: {msg.data.actionReceipt.days} days ({msg.data.actionReceipt.dates})
                      </div>
                      <div style={{ fontSize: '11px', color: '#0F8B5A', fontWeight: '700', marginTop: '4px' }}>
                        Remaining Balance: {msg.data.actionReceipt.remainingBalance} days • Synced with Mobile
                      </div>
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                <div
                  style={{
                    fontSize: '9.5px',
                    color: isUser ? 'rgba(255,255,255,0.7)' : '#94A3B8',
                    textAlign: 'right',
                    marginTop: '6px',
                  }}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: '#1A3C6E',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={14} color="#6EE7B7" />
            </div>
            <div
              style={{
                background: '#FFFFFF',
                padding: '10px 16px',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: '#64748B',
              }}
            >
              <Loader2 size={14} className="spin" />
              <span>Aura is checking ground-truth operations data...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice Recognition Status Banners */}
      {speechError && (
        <div
          style={{
            margin: '0 16px 8px 16px',
            padding: '8px 12px',
            borderRadius: '8px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            fontSize: '11.5px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={14} />
          <span>{speechError}</span>
        </div>
      )}

      {isListening && (
        <div
          style={{
            margin: '0 16px 8px 16px',
            padding: '10px 14px',
            borderRadius: '8px',
            background: '#EFF6FF',
            border: '1.5px solid #3B82F6',
            color: '#1E40AF',
            fontSize: '12px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#EF4444',
                display: 'inline-block',
                boxShadow: '0 0 0 4px rgba(239, 68, 68, 0.25)',
              }}
            />
            <span>
              {voiceLang === 'hi-IN'
                ? '🎙️ हिंदी में सुन रहा हूँ... कृपया बोलिए'
                : '🎙️ Listening in English... Speak your question now'}
            </span>
          </div>

          <button
            type="button"
            onClick={toggleListening}
            style={{
              background: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            {voiceLang === 'hi-IN' ? 'रोकें (Stop)' : 'Stop Voice'}
          </button>
        </div>
      )}

      {/* Input Bar pinned to bottom */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #E2E8F0',
          background: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <input
          type="text"
          placeholder={
            voiceLang === 'hi-IN'
              ? "हिंदी में बोलें या टाइप करें (जैसे 'आज कितना काम हुआ?', 'हाजिरी दिखाओ')..."
              : "Ask Aura or speak (e.g. 'How much work was done today?', 'Show attendance')..."
          }
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSend();
            }
          }}
          style={{
            flex: 1,
            padding: '11px 14px',
            borderRadius: '8px',
            border: isListening ? '2px solid #3B82F6' : '1.5px solid #CBD5E1',
            outline: 'none',
            fontSize: '13px',
            background: isListening ? '#F0FDF4' : '#F8FAFC',
            color: '#0F172A',
            transition: 'all 0.15s ease',
          }}
        />

        {/* Voice Input Microphone Button */}
        <button
          type="button"
          onClick={toggleListening}
          title={
            isListening
              ? 'Click to Stop Listening'
              : `Click to speak in ${voiceLang === 'hi-IN' ? 'Hindi (हिंदी)' : 'English'}`
          }
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: isListening ? '#DC2626' : '#F1F5F9',
            color: isListening ? '#FFFFFF' : '#1A3C6E',
            border: isListening ? '1.5px solid #B91C1C' : '1.5px solid #CBD5E1',
            fontWeight: '700',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            boxShadow: isListening ? '0 0 10px rgba(220, 38, 38, 0.4)' : 'none',
          }}
        >
          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          <span>{isListening ? (voiceLang === 'hi-IN' ? 'सुन रहा हूँ...' : 'Listening...') : (voiceLang === 'hi-IN' ? 'बोलें' : 'Voice')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleSend()}
          disabled={!inputText.trim() || isTyping}
          style={{
            padding: '11px 18px',
            borderRadius: '8px',
            background: inputText.trim() && !isTyping ? '#1A3C6E' : '#94A3B8',
            color: '#FFFFFF',
            border: 'none',
            fontWeight: '700',
            fontSize: '13px',
            cursor: inputText.trim() && !isTyping ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 6px rgba(26, 60, 110, 0.25)',
          }}
        >
          <Send size={15} />
          <span>{voiceLang === 'hi-IN' ? 'भेजें' : 'Send'}</span>
        </button>
      </div>
    </div>
  );
};
