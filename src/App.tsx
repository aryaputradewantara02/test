import { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Medal, 
  Video, 
  Brain, 
  LayoutGrid, 
  Download, 
  Share2, 
  RotateCcw,
  Check,
  Zap,
  Shield,
  ShieldAlert,
  Plane,
  Anchor,
  Wand2,
  Contrast,
  Target,
  ArrowRight,
  Loader2,
  Trees,
  CloudRain,
  Sun,
  Moon,
  Bomb,
  Menu,
  Sparkles,
  Maximize,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Film,
  User,
  X,
  Copy,
  ExternalLink,
  QrCode,
  Globe,
  AlertCircle,
  Radio,
  Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { GoogleGenAI } from "@google/genai";
import { QRCodeSVG } from 'qrcode.react';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs';
import { db, storage, auth } from './lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

import adImage from './A_D.png';
import alImage from './A_L.png';
import auImage from './A_U.png';

const ai = new GoogleGenAI({ apiKey: process.env.MY_PAID_API_KEY || process.env.GEMINI_API_KEY || "" });

type Step = 'START' | 'DASHBOARD' | 'CAMERA' | 'PREVIEW' | 'UNIFORM' | 'CATEGORY' | 'STYLE' | 'PROCESSING' | 'RESULT' | 'ERROR' | 'SHARE_VIEW';

interface Uniform {
  id: string;
  name: string;
  description: string;
  image: string;
  icon: any;
  assetId: string;
  aiPrompt?: string;
}

interface Style {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  icon: any;
  assetId: string;
  tags: string[];
  category: string;
  image: string;
  thumbnail?: string;
  aiPrompt?: string;
}

const UNIFORMS: Uniform[] = [
  {
    id: 'army',
    name: 'TNI ANGKATAN DARAT (AD)',
    description: '',
    image: adImage,
    icon: Shield,
    assetId: 'AD-01'
  },
  {
    id: 'navy',
    name: 'TNI ANGKATAN LAUT (AL)',
    description: '',
    image: alImage,
    icon: Anchor,
    assetId: 'AL-04'
  },
  {
    id: 'airforce',
    name: 'TNI ANGKATAN UDARA (AU)',
    description: '',
    image: auImage,
    icon: Plane,
    assetId: 'AU-07'
  }
];

const CATEGORIES = [
  {
    id: 'formal',
    name: 'FORMAL',
    subtitle: 'REGULATORY STANDARD',
    description: 'Authentic TNI AD, AL, AU Regulations. Precise uniform replication and traditional command lighting.',
    icon: Medal,
    assetId: 'STD-204-TNI',
    tags: ['AD', 'AL', 'AU'],
    image: 'https://picsum.photos/seed/military-formal/800/1000'
  },
  {
    id: 'cinematic',
    name: 'CINEMATIC',
    subtitle: 'ENHANCED HEROICS',
    description: 'AI Heroic & Dramatic Styles with Battlefield Effects. Volumetric smoke, embers, and cinematic grading.',
    icon: Zap,
    assetId: 'ADV-909-HERO',
    tags: ['FX+', 'DEPTH'],
    image: 'https://picsum.photos/seed/military-cinematic/800/1000'
  }
];

const STYLES = [
  {
    id: 'cinematic-ghillie',
    name: 'GHILLIE STEALTH',
    subtitle: 'FOREST OVERWATCH',
    description: 'Deep forest environment with ghillie suit camouflage, dappled sunlight, and sniper positioning.',
    icon: Trees,
    assetId: 'ADV-001-GHILLIE',
    tags: ['FOREST', 'STEALTH'],
    category: 'cinematic',
    image: 'https://picsum.photos/seed/ghillie/800/1000',
    thumbnail: 'https://lh3.googleusercontent.com/d/1YMTVBUTLdS-Z1RDFEURU7fdkqrKLrqZ2'
  },
  {
    id: 'cinematic-urban-extraction',
    name: 'URBAN EXTRACTION',
    subtitle: 'HIGH-STAKES DEPLOYMENT',
    description: 'Rainy urban rooftop with tactical gear, extraction helicopter in background, and dramatic lighting.',
    icon: CloudRain,
    assetId: 'ADV-002-URBAN',
    tags: ['URBAN', 'RAIN'],
    category: 'cinematic',
    image: 'https://picsum.photos/seed/urban-tactical/800/1000',
    thumbnail: 'https://lh3.googleusercontent.com/d/1rDicm9dWUUXt3DUu1NAnfzx0LWbk0eOs'
  },
  {
    id: 'cinematic-desert',
    name: 'DESERT FRONTLINE',
    subtitle: 'ARID ENGAGEMENT',
    description: 'Harsh desert environment with tactical vehicle, dust clouds, and intense sunlight.',
    icon: Sun,
    assetId: 'ADV-003-DESERT',
    tags: ['DESERT', 'COMBAT'],
    category: 'cinematic',
    image: 'https://picsum.photos/seed/desert-combat/800/1000',
    thumbnail: 'https://lh3.googleusercontent.com/d/1T1MhiifGIIKHRkXaTPa6LPmVqoCWM289'
  },
  {
    id: 'cinematic-neon',
    name: 'NEON STRIKE',
    subtitle: 'CYBER TACTICAL',
    description: 'Rainy city alleyway with vibrant neon lights, stealth tactical suit, and cinematic reflections.',
    icon: Moon,
    assetId: 'ADV-004-NEON',
    tags: ['NEON', 'NIGHT'],
    category: 'cinematic',
    image: 'https://picsum.photos/seed/neon-stealth/800/1000',
    thumbnail: 'https://lh3.googleusercontent.com/d/1slhQU6Rg-xQtMC-xNgLYcNRVhRO5ujRl'
  },
  {
    id: 'cinematic-jungle-sniper',
    name: 'JUNGLE SNIPER',
    subtitle: 'ELITE RAID',
    description: 'Elite spec-ops sniper mission at sunrise. High-fidelity tactical gear and jungle environment.',
    aiPrompt: '8K ultrarealistic photo of a man (identity locked to the reference but without glasses). Waist-up close view of a modern spec-ops sniper mid-elite raid at sunrise in a jungle compound. Camera angle is cinematic three-quarter from slightly below shoulder level, emphasizing heroism and tactical precision. The operator wears a Navy SEAL–inspired war-movie uniform: fitted multicam combat shirt, lightweight plate carrier with MOLLE pouches for magazines and grenades, hydration pack tube over the shoulder, tactical sling diagonally across the torso, ballistic helmet with NVG mount, integrated headset, and IR strobe. The face is beautiful and appealing—cheekbones highlighted by golden sunlight, soft glow on skin with subtle sweat and dust, intense but calm eyes. The operator grips a modern suppressed MK13 precision sniper rifle with bipod folded, optic clean and reflective. Background shows jungle canopy glowing with sunrise, light filtering through mist, warm lens flare, cinematic Navy SEAL-style elite raid atmosphere. in 9:16.',
    icon: Target,
    assetId: 'ADV-005-JUNGLE',
    tags: ['JUNGLE', 'SNIPER', 'SUNRISE'],
    category: 'cinematic',
    image: 'https://picsum.photos/seed/jungle-tactical/800/1000',
    thumbnail: 'https://lh3.googleusercontent.com/d/130waxWCh6T5pFUTMPxvU8YstPJSj2zcR'
  },
  {
    id: 'cinematic-battlefield-smoke',
    name: 'BATTLEFIELD SMOKE',
    subtitle: 'GRITTY ENGAGEMENT',
    description: 'Heavily armed special forces in dense battlefield smoke. Gritty, cinematic atmosphere with tactical gear.',
    aiPrompt: 'A heavily armed special forces operator standing in dense battlefield smoke, wearing full tactical gear in earth-tone camouflage. Ballistic helmet with mounted headset, GI Glasses, reinforced gloves, tactical vest with MOLLE attachments, and a chest patch labeled ‘ARMY’. Holding a modern tan-colored assault rifle with mounted optics, flashlight, rail attachments, and sling. Dramatic low-key lighting from the side highlights the textures of fabric, gear, and weapon metal. Gritty, smoky, and cinematic atmosphere with muted colors.',
    icon: Shield,
    assetId: 'ADV-006-SMOKE',
    tags: ['ARMY', 'SMOKE', 'GRITTY'],
    category: 'cinematic',
    image: 'https://picsum.photos/seed/army-tactical/800/1000',
    thumbnail: 'https://lh3.googleusercontent.com/d/1t0e-XrjbxZKurN6YPXSaIcLX4hZhLqNT'
  },
  {
    id: 'cinematic-industrial-stealth',
    name: 'INDUSTRIAL STEALTH',
    subtitle: 'RAINY EXTRACTION',
    description: 'Stealth extraction in a rainy industrial factory. High-tech tactical gear with dramatic shadows and amber lighting.',
    aiPrompt: 'A hyper detailed cinematic scene medium shot featuring the hero positioned on the rusted steel grating of an abandoned industrial factory during a heavy, torrential downpour. Wearing a dark, high-tech waterproof tactical jacket, with hyper-realistic water droplets rolling off the slick neoprene fabric. A long, suppressed sniper rifle is mounted on a corroded metal railing, the cold steel of the weapon beaded with rain. The lighting is a cinematic mix of deep shadows and harsh, flickering industrial amber lights reflecting off the wet surfaces, creating a cold, gritty, and deeply immersive stealth atmosphere.',
    icon: CloudRain,
    assetId: 'ADV-007-INDUSTRIAL',
    tags: ['INDUSTRIAL', 'RAIN', 'STEALTH'],
    category: 'cinematic',
    image: 'https://picsum.photos/seed/industrial-stealth/800/1000',
    thumbnail: 'https://lh3.googleusercontent.com/d/1BEcBSii_GS8HLGF1nUIsE2HFiAyNZNKZ'
  },
  {
    id: 'cinematic-jungle-escape',
    name: 'JUNGLE ESCAPE',
    subtitle: 'SURVIVAL INSTINCT',
    description: 'High-octane jungle escape from a downed helicopter. Intense action with fire and rain effects.',
    aiPrompt: 'Cinematic action photography featuring the hero sprinting away from a massive, fiery downed military helicopter in a dense, swampy jungle. Wearing a tactical chest rig and mud-splattered olive drab shirt. Firing a heavy machine gun from the hip backward into thick, smoke-filled foliage. Background features towering ancient trees, pouring rain, and brilliant orange flames. Shot as a hyper-realistic blockbuster movie still with intense motion blur and gritty high-contrast color grading.',
    icon: Zap,
    assetId: 'ADV-008-ESCAPE',
    tags: ['JUNGLE', 'ACTION', 'FIRE'],
    category: 'cinematic',
    image: 'https://picsum.photos/seed/jungle-escape/800/1000',
    thumbnail: 'https://lh3.googleusercontent.com/d/1KXQd2dJ-SLq6zVDEwU7L2DWjrZZhRyPb'
  },
  {
    id: 'cinematic-subterranean-combat',
    name: 'SUBTERRANEAN COMBAT',
    subtitle: 'URBAN TACTICAL',
    description: 'Dark, claustrophobic subterranean combat in subway tunnels with teal and blue lighting.',
    aiPrompt: 'A hyper-realistic, 8k, highly detailed cinematic film still, 50mm lens, slight Dutch angle, capturing the rugged Caucasian operative (consistent face reference) navigating dark, claustrophobic subterranean subway tunnels. He is wearing dark urban tactical gear and is engaged in close-quarters combat. Suppressed pistol and combat knife drawn, facing an enemy in the dim, cool-toned teal and blue lighting. Grimy, wet concrete walls, debris. Lighting comes from distant, flickering lights and a headlamp, creating dramatic volumetric dust and deep shadows. Moody, tense atmosphere. Medium shot with focus on his eyes and the texture of his gear. in 9:16.',
    icon: Target,
    assetId: 'ADV-011-SUBWAY',
    tags: ['URBAN', 'TACTICAL', 'CQB'],
    category: 'cinematic',
    image: 'https://picsum.photos/seed/subway-tactical/800/1000',
    thumbnail: 'https://lh3.googleusercontent.com/d/1i-0D-nacZPccKgT9QWifNjCa2ccryg_L'
  },
  {
    id: 'cinematic-industrial-breach',
    name: 'INDUSTRIAL BREACH',
    subtitle: 'COVERT OPERATION',
    description: 'High-octane warehouse breach with dynamic action, muzzle blasts, and gritty industrial atmosphere.',
    aiPrompt: 'A hyper-realistic, 8k, highly detailed cinematic film still capturing the person from Image 1 as a rugged operative. Identity is strictly locked to the person in Image 1. He is in a dynamic, full-throttle run, having just dynamically kicked open a reinforced steel door within a smoky, dark industrial warehouse during a covert breach. The impact of the kick has sent splintered wood and metal debris exploding outwards, illuminated by volumetric shafts of dirty ambient light mixed with warm, flashing muzzle blasts from an interior skirmish. He is pushing aggressively into the room, suppressing an unseen target with a suppressed, short-barreled carbine, held at a low-ready position. He wears full urban-green and black tactical armor, including a plate carrier, helmet (NVGs flipped up), and breaching tools slung on his back. Water drips from overhead pipes, spent shell casings are mid-air, bouncing on the greasy concrete floor, and dust fills the vibrant, chaotic air. Cinematic, high-contrast lighting creates dramatic rim lighting on his profile and the complex textures of his gear. The tone is suspenseful, gritty, and high-octane. Medium-wide, slightly low-angle shot, 50mm lens',
    icon: Zap,
    assetId: 'ADV-010-BREACH',
    tags: ['INDUSTRIAL', 'ACTION', 'BREACH'],
    category: 'cinematic',
    image: 'https://picsum.photos/seed/industrial-breach/800/1000',
    thumbnail: 'https://lh3.googleusercontent.com/d/1xyc0utlMh_tXa3PqEODPalnEnWMSdFs_'
  },
  {
    id: 'cinematic-desert-chase',
    name: 'DESERT CHASE',
    subtitle: 'HIGH-SPEED PURSUIT',
    description: 'Intense desert pursuit with heavy machine gun engagement. High-speed action with massive dust plumes.',
    aiPrompt: 'A hyper-realistic, 8k, highly detailed cinematic action shot, 24mm wide-angle lens, capturing the person from Image 1 as a rugged operative. Identity is strictly locked to the person in Image 1. He is gripping a mounted heavy machine gun (M2 Browning) in the back of a speeding converted technical pickup. He is firing backwards at a cloud of pursuing SUVs, his intense, determined expression visible despite the dust and debris. Desert camouflage gear, dusty face. The setting is a winding canyon road under harsh midday sun, kicking up massive dust plumes. Dynamic composition from a lower angle, motion blur. Cinematic lighting, deep shadows, high contrast. Gritty, explosive tone. 2:3r',
    icon: Zap,
    assetId: 'ADV-011-CHASE',
    tags: ['DESERT', 'ACTION', 'CHASE'],
    category: 'cinematic',
    image: 'https://picsum.photos/seed/desert-chase/800/1000',
    thumbnail: 'https://lh3.googleusercontent.com/d/1ffKGFOuWgldKkjCUBLFr-XgR1hp2dfiY'
  },
  {
    id: 'cinematic-winter-survival',
    name: 'WINTER SURVIVAL',
    subtitle: 'BLIZZARD EXTRACTION',
    description: 'Tactical survival in a heavy winter blizzard. Gritty atmosphere with fur-lined parka and smoldering wreckage.',
    aiPrompt: 'Cinematic masterpiece, hyper-photorealistic 8k. The person from Image 1 is walking purposefully forward through a heavy winter blizzard. Identity is strictly locked to the person in Image 1. He is holding a suppressed tactical submachine gun at the low ready, wearing a heavy black parka with a thick fur-lined hood covered in fresh snowflakes and dark streetwear, low-angle dynamic tracking shot, shot on 35mm Leica, shallow depth of field with the blurred, smoldering wreckage of a black tactical SUV in the snowy background, moody overcast lighting dramatically illuminated by warm orange firelight from the wreckage, dramatic desaturated color grading, sharp contrast, blowing snow effects freezing in mid-air, matte tactical gear textures, gritty survivalist noir atmosphere, insane level of detail',
    icon: CloudRain,
    assetId: 'ADV-012-WINTER',
    tags: ['WINTER', 'SURVIVAL', 'SNOW'],
    category: 'cinematic',
    image: 'https://picsum.photos/seed/winter-tactical/800/1000',
    thumbnail: 'https://lh3.googleusercontent.com/d/1HTrRvbDkBcW817an0sCOMxxp0_2TC6YU'
  },
  {
    id: 'cinematic-jammer-fortuner',
    name: 'JAMMER FORTUNER',
    subtitle: 'TACTICAL INTERCEPTION',
    description: 'High-tech jamming operation with Fortuner vehicle, electronic signals, and tactical deployment.',
    icon: Zap,
    assetId: 'ADV-014-JAMMER',
    tags: ['VEHICLE', 'TACTICAL', 'JAMMER'],
    category: 'cinematic',
    image: 'https://lh3.googleusercontent.com/d/1Uz_3fD3vzZOcH4y1KcCtLWgqI0VvjNOr',
    thumbnail: 'https://lh3.googleusercontent.com/d/1Uz_3fD3vzZOcH4y1KcCtLWgqI0VvjNOr',
    aiPrompt: 'Photorealistic integration. ULTRA-HD QUALITY: Sharp focus, zero blur. MANDATORY: Use the reference image as the absolute base. Keep the background, Fortuner, and antennas UNCHANGED. POSITION & POSE: The user MUST BE LEANING against the side of the vehicle, positioned slightly FORWARD toward the rear passenger door, ensuring the OPEN TRUNK (bagasi) is FULLY VISIBLE and NOT OBSCURED by the human subject. Replicate the leaning pose but shifted forward to preserve the view of the electronic gear in the back. SCALE & PROPORTION: 1:1 NATURAL SCALE. GEAR: Tactical Tiger Stripe camouflage uniform with black tactical vest. NATURAL BLENDING: Seamless face-to-body unification. Match skin tones, shadows, and environment lighting wrap perfectly. High-fidelity rendering, 8k.'
  },
  {
    id: 'cinematic-korlantas',
    name: 'KORLANTAS TACTICAL',
    subtitle: 'HIGHWAY INTERCEPTION',
    description: 'Elite Korlantas traffic police unit with specialized patrol vehicle and tactical highway gear.',
    icon: Shield,
    assetId: 'ADV-015-KORLANTAS',
    tags: ['POLICE', 'VEHICLE', 'KORLANTAS'],
    category: 'cinematic',
    image: 'https://lh3.googleusercontent.com/d/1RM3Z-KLHB5yDJxV8m1EWr4_Aqbe9eYgL',
    thumbnail: 'https://lh3.googleusercontent.com/d/1RM3Z-KLHB5yDJxV8m1EWr4_Aqbe9eYgL',
    aiPrompt: 'Photorealistic integration. ULTRA-HD QUALITY: Sharp focus, 8k textures. MANDATORY: Use the Korlantas reference image as the base. Keep the background and Korlantas vehicle UNCHANGED. POSITION & POSE: The user (locked to identity) MUST STAND to the LEFT of the vehicle, shifted FURTHER LEFT beyond the rear tire area to ensure a clear view of the car side. Integration must use 1:1 NATURAL SCALE (matching real-world human-to-vehicle height ratio), wearing Indonesian Korlantas tactical uniform. NATURAL BLENDING: Seamless face-to-body transfer, matching shadows and lighting perfectly to the highway environment.'
  },
  {
    id: 'cinematic-cbrn',
    name: 'CBRN TACTICAL',
    subtitle: 'HAZARDOUS RESPONSE',
    description: 'Specialized CBRN unit equipped for chemical and biological threat mitigation in contaminated zones.',
    icon: ShieldAlert,
    assetId: 'ADV-016-CBRN',
    tags: ['CBRN', 'TACTICAL', 'HAZMAT'],
    category: 'cinematic',
    image: 'https://lh3.googleusercontent.com/d/1ZWlqk84QQO9RS0V_ZuGVMt4Qul4--ozr',
    thumbnail: 'https://lh3.googleusercontent.com/d/1ZWlqk84QQO9RS0V_ZuGVMt4Qul4--ozr',
    aiPrompt: 'Photorealistic integration. ULTRA-HD QUALITY: Sharp focus, 8k textures. MANDATORY: Use the CBRN reference image as the absolute base. Keep the background and CBRN vehicle/equipment UNCHANGED. POSITION & POSE: The user (locked to identity) MUST ALWAYS be standing EXACTLY to the LEFT SIDE of the FRONT TIRE of the vehicle. This position is STATIC and MUST NOT change. The user should be wearing the Indonesian CBRN tactical suit but WITHOUT any gas mask or headgear, ensuring the face and hair are fully visible and unobstructed. Integration must use 1:1 NATURAL SCALE. NATURAL BLENDING: Seamless head-to-body unification. Match shadows and toxic environment lighting perfectly to the exposed face and hair.'
  },
  {
    id: 'cinematic-next-g',
    name: 'NEXT-G TACTICAL',
    subtitle: 'FUTURE WARFARE',
    description: 'Next-generation tactical unit featuring advanced experimental armor and high-tech scouting vehicle.',
    icon: Wand2,
    assetId: 'ADV-017-NEXTG',
    tags: ['FUTURE', 'TACTICAL', 'EXPERIMENTAL'],
    category: 'cinematic',
    image: 'https://lh3.googleusercontent.com/d/16trJIEHaSaqjvJfpqwdepROWlN-DYoIf',
    thumbnail: 'https://lh3.googleusercontent.com/d/16trJIEHaSaqjvJfpqwdepROWlN-DYoIf',
    aiPrompt: 'Photorealistic integration. ULTRA-HD QUALITY: Sharp focus, 8k textures. MANDATORY: Use the NEXT-G reference image as the absolute base. Keep the background and the specialized vehicle/equipment UNCHANGED. POSITION & POSE: The user (locked to identity) MUST ALWAYS be standing EXACTLY to the LEFT SIDE of the REAR TIRE of the vehicle. This position is STATIC and MUST NOT change. Integration must use 1:1 NATURAL SCALE (matching real-world human-to-vehicle height ratio). The user should be wearing a minimalist tech wear style tactical uniform (sleek, functional, modern). NATURAL BLENDING: Seamless face-to-body unification. Match shadows and the crisp, clean futuristic lighting environment perfectly.'
  },
  {
    id: 'cinematic-pdn',
    name: 'PDN TACTICAL',
    subtitle: 'NATION DATA DEFENSE',
    description: 'Elite security forces specialized in strategic asset protection and national data center perimeter defense.',
    icon: Shield,
    assetId: 'ADV-018-PDN',
    tags: ['DATA', 'TACTICAL', 'SECURITY'],
    category: 'cinematic',
    image: 'https://lh3.googleusercontent.com/d/17CRCdJ1V19U5zTXsoE_zLgtajz15mJ0T',
    thumbnail: 'https://lh3.googleusercontent.com/d/17CRCdJ1V19U5zTXsoE_zLgtajz15mJ0T',
    aiPrompt: 'Photorealistic integration. ULTRA-HD QUALITY: Sharp focus, 8k textures. MANDATORY: Use the PDN reference image as the absolute base. Keep the background and the specialized equipment/server environment UNCHANGED. POSITION & POSE: The user (locked to identity) MUST ALWAYS be standing EXACTLY to the RIGHT SIDE of the REAR TIRE of the vehicle. This position is STATIC and MUST NOT change. Integration must use 1:1 NATURAL SCALE (matching real-world human-to-vehicle height ratio). The user should be wearing a clean, high-tech tactical uniform fitting for Indonesian National Data security. NATURAL BLENDING: Seamless face-to-body unification. Match shadows and the crisp, technological lighting environment perfectly.'
  },
  {
    id: 'cinematic-rapid-response',
    name: 'RAPID RESPONSE',
    subtitle: 'EMERGENCY MOBILITY',
    description: 'High-speed tactical response unit designed for immediate deployment and extreme urban agility.',
    icon: Zap,
    assetId: 'ADV-019-RAPID',
    tags: ['RAPID', 'TACTICAL', 'VEHICLE'],
    category: 'cinematic',
    image: 'https://lh3.googleusercontent.com/d/1Ts9O80gjqr7WbMz3jfKkoQ8SktkBPhQt',
    thumbnail: 'https://lh3.googleusercontent.com/d/1Ts9O80gjqr7WbMz3jfKkoQ8SktkBPhQt',
    aiPrompt: 'Photorealistic integration. ULTRA-HD QUALITY: Sharp focus, 8k textures. MANDATORY: Use the Rapid Response reference image as the absolute base. Keep the background and the specialized vehicle/equipment UNCHANGED. POSITION & POSE: The user (locked to identity) MUST ALWAYS be standing EXACTLY to the LEFT SIDE of the REAR TIRE of the vehicle. This position is STATIC and MUST NOT change. Integration must use 1:1 NATURAL SCALE (matching real-world human-to-vehicle height ratio). The user should be wearing a high-performance tactical uniform suitable for rapid emergency response. NATURAL BLENDING: Seamless face-to-body unification. Match shadows and the dynamic, outdoor lighting environment perfectly.'
  },
  {
    id: 'cinematic-hiace-antidrone',
    name: 'HIACE ANTIDRONE',
    subtitle: 'AIRSPACE DEFENSE',
    description: 'Mobile electronic warfare unit equipped with long-range antidrone jamming systems and tactical surveillance.',
    icon: Radio,
    assetId: 'ADV-020-HIACE',
    tags: ['ANTIDRONE', 'TACTICAL', 'ELECTRONIC'],
    category: 'cinematic',
    image: 'https://lh3.googleusercontent.com/d/1XJgNAfaWzYVyynb7yo-YTitI4Xr0WZU6',
    thumbnail: 'https://lh3.googleusercontent.com/d/1XJgNAfaWzYVyynb7yo-YTitI4Xr0WZU6',
    aiPrompt: 'Photorealistic integration. ULTRA-HD QUALITY: Sharp focus, 8k textures. MANDATORY: Use the Hiace Antidrone reference image as the absolute base. Keep the background and the specialized vehicle/antidrone equipment UNCHANGED. POSITION & POSE: The user (locked to identity) MUST ALWAYS be standing EXACTLY to the LEFT SIDE of the FRONT TIRE of the vehicle. This position is STATIC and MUST NOT change. Integration must use 1:1 NATURAL SCALE (matching real-world human-to-vehicle height ratio). The user should be wearing a specialized Indonesian technical tactical uniform. NATURAL BLENDING: Seamless face-to-body unification. Match shadows and the technical environment lighting perfectly.'
  },
  {
    id: 'cinematic-xplorer',
    name: 'XPLORER TACTICAL',
    subtitle: 'TERRAIN DOMINANCE',
    description: 'All-terrain tactical reconnaissance unit designed for extreme environment exploration and perimeter scouting.',
    icon: Compass,
    assetId: 'ADV-021-XPLORER',
    tags: ['XPLORER', 'TACTICAL', 'TERRAIN'],
    category: 'cinematic',
    image: 'https://lh3.googleusercontent.com/d/18WDnBktT0dVu7H6jOutaz3O-B9qc2swz',
    thumbnail: 'https://lh3.googleusercontent.com/d/18WDnBktT0dVu7H6jOutaz3O-B9qc2swz',
    aiPrompt: 'Photorealistic integration. ULTRA-HD QUALITY: Sharp focus, 8k textures. MANDATORY: Use the Xplorer Tactical reference image as the absolute base. Keep the background and the specialized all-terrain vehicle UNCHANGED. POSITION & POSE: The user (locked to identity) MUST ALWAYS be standing EXACTLY to the LEFT SIDE of the REAR TIRE of the vehicle. This position is STATIC and MUST NOT change. Integration must use 1:1 NATURAL SCALE (matching real-world human-to-vehicle height ratio). The user should be wearing a rugged, high-tech explorer tactical uniform. NATURAL BLENDING: Seamless face-to-body unification. Match shadows and the natural outdoor lighting environment perfectly.'
  }
];

export default function App() {
  const [step, setStep] = useState<Step>('START');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedUniform, setSelectedUniform] = useState<Uniform>(UNIFORMS[1]);
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0]);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [styleCategory, setStyleCategory] = useState<'formal' | 'cinematic' | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [sharedViewerImage, setSharedViewerImage] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isLiveFeedOpen, setIsLiveFeedOpen] = useState(true);
  const [navigationIntent, setNavigationIntent] = useState<'tactical' | 'cinematic' | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [photoTimer, setPhotoTimer] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isGestureDetected, setIsGestureDetected] = useState(false);
  const [handDetector, setHandDetector] = useState<any>(null);
  const [handPoint, setHandPoint] = useState<{ x: number, y: number } | null>(null);
  
  const isCountdownRunning = useRef(false);
  const gestureFramesCount = useRef(0); // To track how many consecutive frames the gesture is held
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<any>(null);

  useEffect(() => {
    const initDetector = async () => {
      try {
        console.log("Initializing Hand Detector...");
        // Prefer WebGL for performance
        try {
          await tf.setBackend('webgl');
        } catch (e) {
          console.warn("WebGL not supported, falling back to CPU");
          await tf.setBackend('cpu');
        }
        await tf.ready();
        
        const model = handPoseDetection.SupportedModels.MediaPipeHands;
        const detectorConfig: any = {
          runtime: 'tfjs',
          modelType: 'lite',
          maxHands: 2,
        };
        const detector = await handPoseDetection.createDetector(model, detectorConfig);
        detectorRef.current = detector;
        setHandDetector(detector);
        console.log("Hand detector initialized successfully on backend:", tf.getBackend());
      } catch (err) {
        console.error("Failed to initialize hand detector:", err);
      }
    };
    initDetector();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const takePhoto = () => {
    // SYNCHRONOUS REF LOCK: Instantly block any further calls
    if (isCountdownRunning.current) return;
    
    isCountdownRunning.current = true;
    setPhotoTimer(5);
  };

  useEffect(() => {
    if (photoTimer === null) {
      isCountdownRunning.current = false;
      return;
    }

    if (photoTimer === 0) {
      // Actually take the photo
      if (videoRef.current && canvasRef.current) {
        const context = canvasRef.current.getContext('2d');
        if (context) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          
          // Flip horizontally to match the non-mirrored preview
          context.translate(canvasRef.current.width, 0);
          context.scale(-1, 1);
          
          context.drawImage(videoRef.current, 0, 0);
          // Use JPEG with 1.0 quality for maximum HD detail for the AI
          const data = canvasRef.current.toDataURL('image/jpeg', 1.0);
          setCapturedImage(data);
          setStep('PREVIEW');
          stopCamera();
        }
      }
      setPhotoTimer(null);
      return;
    }

    const timer = setTimeout(() => {
      setPhotoTimer(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [photoTimer]);

  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `tni-uniform-swap-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRetake = () => {
    setShareUrl(null);
    setShareId(null);
    setShowShareModal(false);
    setIsSharing(false);
    setStep('CAMERA');
  };

  const handleShare = async () => {
    if (!resultImage || isSharing) return;
    
    setIsSharing(true);
    setShareStatus("AUTHENTICATING...");
    try {
      // Ensure user is signed in anonymously if not already
      if (!auth.currentUser) {
        setShareStatus("ENCRYPTING CHANNEL...");
        const { signInAnonymously } = await import('firebase/auth');
        await signInAnonymously(auth);
      }

      setShareStatus("OPTIMIZING ASSET...");
      // Check if image data might exceed Firestore's 1MB limit (~1.3M chars in base64)
      let finalImageData = resultImage;
      if (resultImage.length > 1000000) {
        setShareStatus("COMPRESSING ASSET...");
        // Simple canvas-based compression
        const img = new Image();
        img.src = resultImage;
        await new Promise((resolve) => (img.onload = resolve));
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          finalImageData = canvas.toDataURL('image/jpeg', 0.6); // Aggressive compression
        }
      }

      setShareStatus("GENERATING DATABASE ENTRY...");
      const uniqueId = `ID_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      
      // Store in Firestore only (bypass Storage)
      await setDoc(doc(db, 'shares', uniqueId), {
        id: uniqueId,
        imageData: finalImageData,
        createdAt: serverTimestamp()
      });

      const publicUrl = "https://ais-pre-ja2osulni5gita6subtny5-48605170990.asia-east1.run.app";
      const appShareUrl = `${publicUrl}?s=${uniqueId}`;
      setShareId(uniqueId);
      setShareUrl(appShareUrl);
      setErrorMessage(null);
      setShowShareModal(true);
    } catch (err: any) {
      console.error('Error in Database Uplink:', err);
      setErrorMessage(`COMMUNICATION FAILURE: ${err.message || "Uplink failed"}`);
      setStep('ERROR');
    } finally {
      setIsSharing(false);
      setShareStatus(null);
    }
  };

  // Deep Link Detection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('s');
    if (sid) {
      const fetchShare = async () => {
        setStep('PROCESSING');
        setShareStatus("DECRYPTING ASSET...");
        try {
          const docRef = doc(db, 'shares', sid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setSharedViewerImage(docSnap.data().imageData);
            setStep('SHARE_VIEW');
          } else {
            setErrorMessage("ASSET NOT FOUND or EXPIRED.");
            setStep('ERROR');
          }
        } catch (err) {
          setErrorMessage("COMMUNICATION FAILURE: Link corrupted.");
          setStep('ERROR');
        } finally {
          setShareStatus(null);
        }
      };
      fetchShare();
    }
  }, []);

  useEffect(() => {
    if (step === 'CAMERA') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [step]);

  // Hand Gesture Tracking Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastExecutedTime = 0;
    const FRAME_INTERVAL = 60; // Slightly faster (approx 15 FPS)

    const detectGesture = async () => {
      if (step !== 'CAMERA' || !detectorRef.current || !videoRef.current || videoRef.current.readyState < 2) {
        if (handPoint !== null) setHandPoint(null);
        if (isGestureDetected) setIsGestureDetected(false);
        gestureFramesCount.current = 0;
        animationFrameId = requestAnimationFrame(detectGesture);
        return;
      }

      const now = Date.now();
      if (now - lastExecutedTime < FRAME_INTERVAL) {
        animationFrameId = requestAnimationFrame(detectGesture);
        return;
      }
      lastExecutedTime = now;

      try {
        const pixels = tf.browser.fromPixels(videoRef.current);
        const hands = await detectorRef.current.estimateHands(pixels, { flipHorizontal: false });
        pixels.dispose();
        
        if (hands && hands.length > 0) {
          const hand = hands[0];
          
          // CRITICAL: High confidence check (Skip if AI is not 85%+ sure)
          if (hand.score < 0.85) {
            setHandPoint(null);
            setIsGestureDetected(false);
            gestureFramesCount.current = 0;
            animationFrameId = requestAnimationFrame(detectGesture);
            return;
          }

          const keypoints = hand.keypoints;
          const indexTip = keypoints[8];
          const wrist = keypoints[0];

          if (videoRef.current) {
            const videoWidth = videoRef.current.videoWidth;
            const videoHeight = videoRef.current.videoHeight;
            setHandPoint({
              x: (1 - indexTip.x / videoWidth) * 100,
              y: (indexTip.y / videoHeight) * 100
            });
          }

          // STRICT GESTURE: Logic for Thumbs Down and Palm
          const getDist = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
          
          const fingers = [
            { tip: 4, base: 2 },   // Thumb
            { tip: 8, base: 5 },   // Index
            { tip: 12, base: 9 },  // Middle
            { tip: 16, base: 13 }, // Ring
            { tip: 20, base: 17 }  // Pinky
          ];

          // 1. THUMBS DOWN GESTURE (CANCEL)
          const thumbTip = keypoints[4];
          const thumbBase = keypoints[2];
          const isThumbDown = thumbTip.y > thumbBase.y + 15;
          
          let curledCount = 0;
          for (let i = 1; i < 5; i++) {
            const tipDist = getDist(keypoints[fingers[i].tip], wrist);
            const baseDist = getDist(keypoints[fingers[i].base], wrist);
            if (tipDist < baseDist * 1.1) curledCount++;
          }

          if (isCountdownRunning.current && isThumbDown && curledCount >= 3) {
            setPhotoTimer(null);
            setIsGestureDetected(false);
            gestureFramesCount.current = 0;
          } 
          // 2. PALM GESTURE (START)
          else {
            let extendedCount = 0;
            fingers.forEach((f, idx) => {
              const tipDist = getDist(keypoints[f.tip], wrist);
              const baseDist = getDist(keypoints[f.base], wrist);
              if (tipDist > baseDist * 1.25) extendedCount++;
            });

            if (!isCountdownRunning.current && extendedCount >= 4) {
              gestureFramesCount.current += 1;
              if (gestureFramesCount.current >= 6) {
                setIsGestureDetected(true);
                takePhoto();
                gestureFramesCount.current = 0;
              }
            } 
            else {
              setIsGestureDetected(false);
              gestureFramesCount.current = 0;
            }
          }
        } else {
          setHandPoint(null);
          setIsGestureDetected(false);
          gestureFramesCount.current = 0;
        }
      } catch (err) {
        console.error("Gesture detection error:", err);
      }

      animationFrameId = requestAnimationFrame(detectGesture);
    };

    if (step === 'CAMERA' && handDetector) {
      detectGesture();
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [step, handDetector]); // Removed photoTimer from dependency to prevent re-starting loop every second

  const processImageWithAI = async () => {
    if (!capturedImage) return;
    
    setIsAiProcessing(true);
    try {
      // Convert base64 captured image to the format Gemini expects
      const base64Data = capturedImage.split(',')[1];
      
      // Determine reference image based on category
      const referenceImageUrl = selectedCategory.id === 'formal' 
        ? selectedUniform.image 
        : selectedStyle.image;

      // Fetch the reference image and convert to base64
      const referenceResponse = await fetch(referenceImageUrl);
      const referenceBlob = await referenceResponse.blob();
      const referenceBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(referenceBlob);
      });
      
      let prompt = "";
      if (selectedCategory.id === 'formal') {
        const aiTechnicalDescriptions: Record<string, string> = {
          army: 'Indonesian Army (TNI AD) "Loreng Malvinas" camouflage pattern (green, brown, and cream blocks).',
          navy: 'Indonesian Navy (TNI AL) digital camouflage pattern (grey, navy blue, and black).',
          airforce: 'Indonesian Air Force (TNI AU) "Swa Bhuwana Paksa" camouflage pattern (light blue, navy blue, and greyish black).'
        };
        const technicalInfo = aiTechnicalDescriptions[selectedUniform.id] || "";

        prompt = `You are an expert Military Digital Compositor specializing in Ultra-HD 8K asset generation and Anatomical Morphing. Your task is to perform a high-fidelity clothing swap that matches the subect's pose EXACTLY. 
        Take the person from Image 1 and dress them in the EXACT uniform from Image 2 (${selectedUniform.name}). 
        
        Technical Reference: ${technicalInfo}
        The style should be FORMAL: clean and professional, but MUST follow the subject's posture and anatomy.

        CRITICAL ANATOMICAL POSE INSTRUCTIONS:
        - Identify the subject's pose (sitting, squatting, standing, or dynamic action) in Image 1 and warp the uniform to match that anatomy perfectly.
        - Simulate realistic fabric physics: create heavy-duty tactical clothing folds at the joints (elbows, knees, waist) corresponding to the pose in Image 1.
        - Do NOT force a standing posture if the subject is in a different position.

        CRITICAL HD ENHANCEMENT INSTRUCTIONS:
        - Maintain ultra-high frequency details: capture the heavy weave of the fabric, ultra-sharp edges of the camouflage pattern, and metallic glint on badges.
        - Avoid all forms of pixel smoothing. Output must be as sharp as a raw DSLR photograph.
        - Ensure "TNI AD" service name and patches are rendered with perfect digital clarity.

        CRITICAL INSTRUCTIONS FOR FULL-BODY INTEGRATION:
        - If the person in Image 1 is visible from head to toe, you MUST synthesize matching tactical trousers and combat boots.
        - Propagate the exact camouflage pattern and colors from Image 2 to the lower body elements.
        - Ensure trousers follow the leg's pose (folds at the knees, contact with ground if sitting) naturally.
        
        Crucially: 
        1. Keep the person's facial identity and exact pose from Image 1 100% intact.
        2. Match the lighting environment of Image 1 onto the uniform and folds perfectly. 
        3. Pay extreme attention to the neck and shoulder area for a seamless transition. 
        4. Output ONLY the resulting image.`;
      } else {
        const styleDescription = selectedStyle.aiPrompt || selectedStyle.description;
        prompt = `You are an expert Cinematic Digital Compositor. Your task is to perform a high-fidelity character integration.
        Take the person from Image 1 and integrate them into the scene described below, using Image 2 as a visual reference for the environment and gear.
        
        Style Description: ${styleDescription}
        
        Crucially:
        1. Maintain the person's facial identity and head structure from Image 1 perfectly.
        2. Apply the dramatic lighting, atmosphere, and cinematic effects described in the Style Description.
        3. The clothing and gear must match the Style Description exactly.
        4. The final output must be a seamless, hyper-realistic 8K cinematic photograph.
        5. Output ONLY the resulting image.`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: "image/png",
              },
            },
            {
              inlineData: {
                data: referenceBase64,
                mimeType: "image/png",
              },
            },
            {
              text: prompt,
            },
          ],
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setResultImage(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (error: any) {
      console.error("AI Processing Error:", error);
      
      const errorStr = JSON.stringify(error);
      const isQuotaError = 
        error?.status === 429 || 
        error?.code === 429 ||
        errorStr.includes('429') || 
        errorStr.includes('RESOURCE_EXHAUSTED') ||
        error?.message?.toLowerCase().includes('quota');

      if (isQuotaError) {
        setErrorMessage("NEURAL LINK SATURATED: System quota exceeded. Cooling down processing cores.");
        setCountdown(60);
        setStep('ERROR');
      } else {
        // Fallback to just showing the uniform if AI fails for other reasons
        setResultImage(selectedUniform.image);
        setStep('RESULT');
      }
    } finally {
      setIsAiProcessing(false);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'ERROR' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  useEffect(() => {
    if (step === 'PROCESSING') {
      setProcessingProgress(0);
      setResultImage(null);
      processImageWithAI();
      
      const interval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 1;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [step]);

  useEffect(() => {
    if (step === 'PROCESSING' && processingProgress === 100 && !isAiProcessing) {
      setStep('RESULT');
    }
  }, [processingProgress, isAiProcessing, step]);

  return (
    <div className="relative h-screen w-screen bg-background text-on-background overflow-hidden font-body">
      {/* HUD Scanline Overlay */}
      <div className="fixed inset-0 hud-scanline pointer-events-none opacity-30 z-50"></div>
      
      {/* Top Navigation */}
      {!['START', 'SHARE_VIEW'].includes(step) && (
      <header className="fixed top-0 left-0 w-full z-[60] flex justify-between items-center px-6 py-8 bg-transparent">
        {step === 'START' ? (
          <>
            <div className="flex items-center">
              {/* Menu removed */}
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary-container animate-pulse shadow-[0_0_8px_rgba(0,255,255,1)]"></div>
              <span className="font-label text-xs tracking-widest text-primary-container uppercase font-bold">OPERATOR ACTIVE</span>
            </div>
          </>
        ) : (
          <>
            <div className={cn("flex items-center gap-4 transition-all duration-700", step !== 'START' && "md:ml-64")}>
              {/* Branding moved to sidebar */}
            </div>
            
            <div className="flex items-center gap-6">
              <div className={cn("hidden md:flex flex-col items-end gap-1 transition-opacity duration-500", step === 'START' ? "opacity-0" : "opacity-100")}>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    step === 'CAMERA' ? "bg-primary-container animate-pulse shadow-[0_0_8px_rgba(0,255,255,1)]" : "bg-outline opacity-50"
                  )}></span>
                  <span className="font-label text-xs tracking-widest text-primary-container uppercase">
                    {step === 'CAMERA' ? 'CAMERA ACTIVE' : ''}
                  </span>
                  {step === 'CAMERA' && (navigationIntent === 'tactical' || navigationIntent === 'cinematic') && (
                    <div className="relative flex items-center h-full">
                      <div className="w-[1px] h-4 bg-white/10 mx-2"></div>
                      <button 
                        onClick={() => setShowInfo(!showInfo)}
                        className={cn(
                          "flex items-center gap-2.5 px-4 py-1.5 rounded-sm border transition-all duration-300",
                          showInfo 
                            ? "bg-primary-container/20 border-primary-container text-white shadow-[0_0_10px_rgba(0,255,255,0.2)]" 
                            : "bg-white/5 border-white/10 text-primary-fixed-dim hover:bg-white/10 hover:border-white/30"
                        )}
                      >
                        <AlertCircle className="w-6 h-6" />
                        <span className="text-[13px] font-headline tracking-[0.2em] uppercase">SYSTEM INFO</span>
                      </button>
                      
                      <AnimatePresence>
                        {showInfo && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 5, scale: 0.95 }}
                            className="absolute top-full mt-4 right-0 w-72 p-5 glass-panel border border-primary-container/30 bg-surface-container-highest/90 z-[100] shadow-2xl backdrop-blur-xl"
                          >
                            <div className="absolute -top-2 right-12 w-4 h-4 bg-surface-container-highest rotate-45 border-l border-t border-primary-container/30"></div>
                                                  <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
                              <Target className="w-4 h-4 text-primary-container" />
                              <span className="text-xs font-headline text-white tracking-[0.2em] uppercase italic">OPERATIONAL PROTOCOL</span>
                            </div>
                            
                            <div className="space-y-4">
                              <div className="flex gap-3">
                                <div className="mt-1 w-2 h-2 rounded-full bg-primary-container"></div>
                                <p className="text-base text-on-surface-variant font-mono leading-relaxed">
                                  Posisikan badan Anda sesuai dengan outline yang berwarna putih.
                                </p>
                              </div>
                              <div className="flex gap-3">
                                <div className="mt-1 w-2 h-2 rounded-full bg-primary-container animate-pulse"></div>
                                <p className="text-base text-white font-mono leading-relaxed">
                                  Tampilkan telapak tangan Anda untuk memulai foto tanpa harus menekan <span className="text-primary-container font-black underline">"TAKE PHOTO"</span>.
                                </p>
                              </div>
                              <div className="flex gap-3">
                                <div className="mt-1 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]"></div>
                                <p className="text-base text-white font-mono leading-relaxed">
                                  Tunjukkan jempol ke bawah (thumbs down) untuk membatalkan hitungan mundur.
                                </p>
                              </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                              <span className="text-[10px] font-label text-white/30 tracking-[0.2em] uppercase">Bio-Metric Lock v.4.2</span>
                              <button 
                                onClick={() => setShowInfo(false)}
                                className="text-[11px] font-headline text-primary-container underline underline-offset-4 hover:text-white transition-colors"
                              >
                                DISMISS
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-4">
              </div>
            </div>
          </>
        )}
      </header>
      )}

      {/* Side Navigation */}
      {!['START', 'SHARE_VIEW'].includes(step) && (
        <>
          {/* Toggle Button for Mobile/Desktop when closed */}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={cn(
              "fixed top-8 z-[80] p-2 bg-surface-container-highest/80 backdrop-blur-md border border-white/10 rounded-full text-primary-container shadow-xl transition-all duration-500 hover:scale-110 active:scale-95 group",
              isSidebarOpen ? "left-[240px]" : "left-6"
            )}
            title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5 flex md:hidden lg:flex" />}
            {!isSidebarOpen && <Menu className="w-5 h-5 md:block lg:hidden" />}
          </button>

          <aside className={cn(
            "fixed left-0 top-0 h-full z-[70] flex flex-col py-8 bg-surface/95 backdrop-blur-2xl border-r border-white/5 shadow-[10px_0_40px_rgba(0,0,0,0.7)] transition-all duration-700 ease-in-out px-4",
            isSidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full pointer-events-none"
          )}>
            <div className={cn("transition-opacity duration-300", !isSidebarOpen && "opacity-0 invisible")}>
              <div 
                onClick={() => {
                  setStep('START');
                  setNavigationIntent(null);
                }}
                className="mb-14 px-4 flex items-stretch gap-3 hover:opacity-80 transition-opacity cursor-pointer group pointer-events-auto"
              >
                {/* Vertical Accent Line */}
                <div className="w-[1.5px] bg-primary-container shadow-[0_0_8px_rgba(0,255,255,0.6)] self-stretch rounded-full" />
                
                <div className="flex flex-col">
                  <span className="text-white font-black font-headline text-2xl tracking-wider uppercase leading-none drop-shadow-[0_0_1px_rgba(0,255,255,0.5)]">INTEK</span>
                  <span className="text-sm text-primary-container/90 font-medium tracking-[0.4em] lowercase mt-1.5">studio</span>
                </div>
              </div>

              <nav className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar">
                <NavItem 
                  icon={LayoutDashboard} 
                  label="DASHBOARD" 
                  active={step === 'DASHBOARD' || step === 'RESULT'} 
                  onClick={() => setStep('DASHBOARD')} 
                />
                
                <div className="py-4 px-4">
                  <div className="h-px bg-white/5 w-full"></div>
                </div>

                <div className="space-y-1">
                  <button 
                    onClick={() => setIsLiveFeedOpen(!isLiveFeedOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 text-on-surface-variant hover:text-white transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Video className="w-5 h-5 opacity-60 group-hover:opacity-100" />
                      <span className="font-headline text-base font-bold tracking-widest uppercase">LIVE FEED</span>
                    </div>
                    {isLiveFeedOpen ? <ChevronUp className="w-4 h-4 opacity-40" /> : <ChevronDown className="w-4 h-4 opacity-40" />}
                  </button>

                  <AnimatePresence>
                    {isLiveFeedOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-1 ml-4"
                      >
                        <NavItem 
                          icon={Shield} 
                          label="TACTICAL UNIFORM" 
                          active={navigationIntent === 'tactical' && (step === 'CAMERA' || step === 'UNIFORM')} 
                          onClick={() => {
                            setNavigationIntent('tactical');
                            setStep('CAMERA');
                          }} 
                          isSubItem
                        />
                        <NavItem 
                          icon={Film} 
                          label="CINEMATIC AI" 
                          active={navigationIntent === 'cinematic' && (step === 'CAMERA' || step === 'STYLE')} 
                          onClick={() => {
                            setNavigationIntent('cinematic');
                            setStep('CAMERA');
                          }} 
                          isSubItem
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </nav>

              <div className="mt-auto px-4 w-full">
                <div className="flex items-center gap-3 py-6 border-t border-white/5">
                  <div className="w-2 h-2 rounded-full bg-primary-container animate-pulse shadow-[0_0_8px_rgba(0,255,255,1)]"></div>
                  <span className="font-label text-sm tracking-widest text-primary-container uppercase font-bold">OPERATOR ACTIVE</span>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Main Content Area */}
      <main className={cn(
        "relative h-full w-full flex items-center justify-center z-10 transition-all duration-700 ease-in-out",
        !['START', 'SHARE_VIEW'].includes(step) && (isSidebarOpen ? "md:pl-64" : "md:pl-0")
      )}>
        <AnimatePresence mode="wait">
          {(step === 'START' || step === 'DASHBOARD') && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative flex flex-col items-center justify-center w-full h-full bg-black overflow-hidden"
            >
              {/* Main Landing Content */}
              <div className="flex flex-col items-center text-center px-6 max-w-5xl z-10">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="mb-2"
                >
                  <span className="text-xs md:text-lg text-white/30 font-label tracking-[0.8em] uppercase">INTEK NEURAL SYSTEM</span>
                </motion.div>

                <motion.h1 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  onClick={() => setStep('DASHBOARD')}
                  className="text-[12vw] md:text-[130px] font-headline font-black tracking-tighter uppercase italic leading-[0.8] flex flex-wrap justify-center items-center cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all group"
                >
                  <span className="text-primary-container drop-shadow-[0_0_30px_rgba(0,255,255,0.4)] group-hover:drop-shadow-[0_0_45px_rgba(0,255,255,0.6)]">INTEK</span>
                  <span className="text-white ml-4 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] group-hover:drop-shadow-[0_0_45px_rgba(255,255,255,0.4)]">STUDIO</span>
                </motion.h1>
                
                <motion.div 
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="w-48 md:w-64 h-1.5 bg-primary-container mt-6 rounded-full shadow-[0_0_20px_rgba(0,255,255,0.8)]"
                />
              </div>

              {/* Bottom Feature Icons */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="absolute bottom-10 left-0 w-full flex justify-center gap-12 md:gap-32 px-6"
              >
                <div className="flex flex-col items-center gap-3">
                  <Shield className="w-8 h-8 text-primary-container/60" />
                  <span className="text-[10px] md:text-xs font-label tracking-[0.3em] text-primary-container/60 font-bold uppercase">ARMOR SYNTHETIC</span>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <Target className="w-8 h-8 text-primary-container/60" />
                  <span className="text-[10px] md:text-xs font-label tracking-[0.3em] text-primary-container/60 font-bold uppercase">FACE LOCK</span>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <Zap className="w-8 h-8 text-primary-container/60" />
                  <span className="text-[10px] md:text-xs font-label tracking-[0.3em] text-primary-container/60 font-bold uppercase">HIGH FIDELITY</span>
                </div>
              </motion.div>
            </motion.div>
          )}

          {step === 'CAMERA' && (
            <motion.div 
              key="camera"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative w-full h-full flex items-center justify-center"
            >
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Hand Tracking Marker */}
              {handPoint && (
                <div 
                  className="absolute z-[100] w-4 h-4 pointer-events-none"
                  style={{ 
                    left: `${handPoint.x}%`, 
                    top: `${handPoint.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="absolute inset-0 bg-primary-container rounded-full animate-ping opacity-60"></div>
                  <div className="absolute inset-1 bg-primary-container rounded-full shadow-[0_0_10px_rgba(0,255,255,1)]"></div>
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-headline text-primary-container font-black tracking-widest drop-shadow-md">
                    TRACKING_ACTIVE
                  </div>
                </div>
              )}
              
              {/* Viewfinder HUD */}
              <div className="relative w-[90%] h-[80%] max-w-5xl max-h-[700px] pointer-events-none">
                {/* Corners */}
                <div className="absolute top-0 left-0 w-16 h-16 border-t border-l border-primary-container/40"></div>
                <div className="absolute top-0 right-0 w-16 h-16 border-t border-r border-primary-container/40"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 border-b border-l border-primary-container/40"></div>
                <div className="absolute bottom-0 right-0 w-16 h-16 border-b border-r border-primary-container/40"></div>
                
                {/* Photo Countdown Overlay */}
                <AnimatePresence>
                  {photoTimer !== null && (
                    <div className="absolute inset-0 flex items-center justify-center z-30">
                      <motion.div
                        key={photoTimer}
                        initial={{ scale: 2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        className="text-[120px] md:text-[180px] font-headline font-black text-primary-container drop-shadow-[0_0_50px_rgba(0,255,255,0.8)] italic"
                      >
                        {photoTimer}
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Flexible Neural Safe Zone Guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-full h-full max-w-lg max-h-[600px] flex flex-col items-center justify-start pt-12">
                    {/* Head & Shoulder Focus (Ensure Face HD) - Separated Head and Body */}
                    <div className="flex flex-col items-center gap-4">
                      {/* Head Guide */}
                      <div className="w-24 h-28 rounded-[45%] border-4 border-white relative shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                         {/* Face crosshair */}
                         <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-1">
                           <div className="w-3 h-[4px] bg-white"></div>
                           <div className="w-3 h-[4px] bg-white"></div>
                         </div>
                      </div>
                      
                      {/* Shoulder/Body Guide */}
                      <div className="w-56 h-48 border-t-4 border-x-4 rounded-t-[3rem] border-white shadow-[0_0_15px_rgba(255,255,255,0.5)]"></div>
                    </div>

                    {/* Safe Zone Brackets */}
                    <div className="absolute inset-0 flex flex-col justify-between p-4 opacity-40">
                      <div className="flex justify-between">
                        <div className="w-8 h-8 border-t-4 border-l-4 border-primary-container"></div>
                        <div className="w-8 h-8 border-t-4 border-r-4 border-primary-container"></div>
                      </div>
                      
                      {/* Dynamic Scanning Line */}
                      <motion.div 
                        animate={{ top: ['20%', '80%', '20%'] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary-container to-transparent z-0"
                      />

                      <div className="flex justify-between">
                        <div className="w-8 h-8 border-b-4 border-l-4 border-primary-container"></div>
                        <div className="w-8 h-8 border-b-4 border-r-4 border-primary-container"></div>
                      </div>
                    </div>

                    {/* Guidance Text */}
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center flex flex-col items-center gap-2">
                      {/* Hide hand status info during countdown for aesthetics */}
                      {photoTimer === null && (
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full transition-colors duration-300",
                            handDetector ? (isGestureDetected ? "bg-primary-container shadow-[0_0_8px_rgba(0,255,255,1)]" : "bg-primary-container/40") : "bg-red-500/40"
                          )}></div>
                          <span className={cn(
                            "text-sm font-label tracking-[0.3em] uppercase transition-colors duration-300",
                            isGestureDetected ? "text-primary-container" : "text-primary-container/40"
                          )}>
                            {handDetector ? (isGestureDetected ? "GESTURE DETECTED : INITIATING" : "HAND GESTURE READY") : "INITIALIZING NEURAL TRACKING..."}
                          </span>
                        </div>
                      )}
                      <span className="text-sm font-label tracking-[0.4em] text-primary-container/60 uppercase">
                        NEURAL SAFE ZONE : POSITION BODY WITHIN BRACKETS
                      </span>
                    </div>
                  </div>
                </div>

                {/* Data Readouts - Removed REC and ISO as requested */}

              </div>

              {/* Bottom Controls Bar */}
              <div className="absolute bottom-0 left-0 w-full h-24 flex items-center justify-center z-20">
                <div className="absolute inset-x-0 bottom-8 h-[1px] bg-primary-container/20"></div>
                <div className="absolute inset-x-0 bottom-12 h-[1px] bg-primary-container/10"></div>
                
                <div className="relative pointer-events-auto">
                  <button 
                    onClick={takePhoto}
                    disabled={photoTimer !== null}
                    className={cn(
                      "relative flex flex-col items-center justify-center w-24 h-24 text-white rounded-lg border border-white/20 shadow-[0_0_40px_rgba(194,65,12,0.3)] active:scale-95 transition-all group overflow-hidden",
                      photoTimer !== null ? "bg-primary-container/20" : "bg-[#c2410c]"
                    )}
                  >
                    {photoTimer !== null ? (
                      <motion.span 
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-4xl font-black font-headline text-primary-container"
                      >
                        {photoTimer}
                      </motion.span>
                    ) : (
                      <>
                        <Camera className="w-10 h-10 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="font-headline text-[9px] font-bold tracking-widest uppercase">TAKE PHOTO</span>
                      </>
                    )}
                    
                    {/* Progress bar for countdown */}
                    {photoTimer !== null && (
                      <motion.div 
                        initial={{ width: "100%" }}
                        animate={{ width: "0%" }}
                        transition={{ duration: 5, ease: "linear" }}
                        className="absolute bottom-0 left-0 h-1 bg-primary-container"
                      />
                    )}
                  </button>
                </div>
              </div>

              {/* HUD Side Buttons */}
              <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-20">
                <HUDButton icon={Target} label="OPTICS" />
                <HUDButton icon={Contrast} label="LEVELS" />
                <HUDButton icon={Wand2} label="ENHANCE" />
              </div>
            </motion.div>
          )}

          {step === 'PREVIEW' && (
            <motion.div 
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative w-full h-full flex items-center justify-center"
            >
              {capturedImage && (
                <img src={capturedImage} alt="Captured" className="absolute inset-0 w-full h-full object-cover" />
              )}
              
              {/* HUD Overlay */}
              <div className="relative w-[90%] h-[80%] max-w-5xl max-h-[700px] pointer-events-none">
                <div className="absolute top-0 left-0 w-16 h-16 border-t border-l border-primary-container/40"></div>
                <div className="absolute top-0 right-0 w-16 h-16 border-t border-r border-primary-container/40"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 border-b border-l border-primary-container/40"></div>
                <div className="absolute bottom-0 right-0 w-16 h-16 border-b border-r border-primary-container/40"></div>
                
              </div>

              {/* Bottom Controls Bar */}
              <div className="absolute bottom-0 left-0 w-full h-24 flex items-center justify-center z-20 gap-4">
                <div className="absolute inset-x-0 bottom-8 h-[1px] bg-primary-container/20"></div>
                
                <button 
                  onClick={() => setStep('CAMERA')}
                  className="relative px-8 py-3 bg-black/60 text-white rounded border border-white/20 font-headline text-[10px] font-bold tracking-widest uppercase hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> RETAKE
                </button>
                <button 
                  onClick={() => {
                    if (navigationIntent === 'tactical') {
                      setSelectedCategory(CATEGORIES[0]);
                      setStep('UNIFORM');
                    } else if (navigationIntent === 'cinematic') {
                      setSelectedCategory(CATEGORIES[1]);
                      setStyleCategory('cinematic');
                      setStep('STYLE');
                    } else {
                      setStep('CATEGORY');
                    }
                  }}
                  className="relative px-12 py-3 bg-primary-container text-black rounded font-headline text-[10px] font-bold tracking-widest uppercase glow-cyan hover:scale-105 transition-all flex items-center gap-2"
                >
                  CONTINUE <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* HUD Side Buttons */}
              <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-20">
                <HUDButton icon={Target} label="OPTICS" />
                <HUDButton icon={Contrast} label="LEVELS" />
                <HUDButton icon={Wand2} label="ENHANCE" />
              </div>
            </motion.div>
          )}

          {step === 'UNIFORM' && (
            <motion.div 
              key="uniform"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center w-full max-w-6xl px-6 py-20 overflow-y-auto max-h-screen no-scrollbar"
            >
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bold font-headline text-primary-container tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(0,251,251,0.3)]">
                  CHOOSE YOUR UNIFORM
                </h2>
                <p className="text-on-surface-variant max-w-lg mx-auto mt-4 text-sm">
                  Select the core asset. Let’s bring the subject into focus with maximum detail
                </p>
              </div>

              <div className="w-full flex flex-col md:flex-row gap-6 justify-center items-stretch">
                {UNIFORMS.map((u) => (
                  <UniformCard 
                    key={u.id} 
                    uniform={u} 
                    selected={selectedUniform.id === u.id} 
                    onClick={() => setSelectedUniform(u)} 
                  />
                ))}
              </div>

              <div className="mt-12 flex flex-col items-center gap-8">
                <button 
                  onClick={() => setStep('PROCESSING')}
                  className="px-12 py-4 bg-primary-container text-black font-headline font-bold tracking-[0.2em] rounded-lg glow-cyan hover:scale-105 transition-all active:scale-95 uppercase"
                >
                  CONTINUE
                </button>

                <button 
                  onClick={() => setStep('CATEGORY')}
                  className="font-headline text-on-surface-variant/60 text-[10px] tracking-[0.3em] uppercase flex items-center justify-center gap-4 group hover:text-primary-container transition-colors"
                >
                  <span className="w-12 h-[1px] bg-white/10 group-hover:bg-primary-container/30 transition-all"></span>
                  BACK TO MODE SELECTION
                  <span className="w-12 h-[1px] bg-white/10 group-hover:bg-primary-container/30 transition-all"></span>
                </button>
              </div>
            </motion.div>
          )}

          {step === 'CATEGORY' && (
            <motion.div 
              key="category"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center w-full max-w-6xl px-6 py-12 overflow-y-auto max-h-screen no-scrollbar"
            >
              <header className="text-center mb-12 max-w-2xl">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="h-px w-12 bg-primary-container/30"></div>
                  <span className="font-label text-primary-container text-xs tracking-[0.5em] uppercase">Post-Processing Selection</span>
                  <div className="h-px w-12 bg-primary-container/30"></div>
                </div>
                <h1 className="font-headline text-4xl md:text-6xl font-extrabold tracking-tighter text-white uppercase italic leading-none">
                  CHOOSE YOUR STYLE
                </h1>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
                {CATEGORIES.map((cat) => (
                  <StyleCard 
                    key={cat.id} 
                    style={cat} 
                    selected={selectedCategory.id === cat.id} 
                    onClick={() => setSelectedCategory(cat)} 
                  />
                ))}
              </div>

              <div className="mt-16 w-full max-w-4xl">
                <button 
                  onClick={() => {
                    if (selectedCategory.id === 'formal') {
                      setStep('UNIFORM');
                    } else {
                      setStyleCategory('cinematic');
                      setStep('STYLE');
                    }
                  }}
                  className="w-full py-6 bg-secondary-container text-secondary-fixed font-headline font-bold tracking-[0.3em] rounded-lg glow-purple hover:opacity-90 transition-all active:scale-[0.98] uppercase"
                >
                  {selectedCategory.id === 'formal' ? 'NEXT: CHOOSE UNIFORM' : 'NEXT: SELECT STYLE'}
                </button>
                <div className="mt-12 flex justify-between items-center w-full border-t border-white/5 pt-8">
                  <div className="flex flex-col">
                    <span className="text-[8px] text-outline tracking-widest uppercase mb-1">SESSION TOKEN</span>
                    <span className="text-[10px] font-mono text-white/40">0xFF-STUDIO-X90</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-outline tracking-widest uppercase mb-1">IMAGE FIDELITY</span>
                    <span className="text-[10px] font-mono text-primary-container">RAW 48-BIT DEPTH</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] text-outline tracking-widest uppercase mb-1">LATENCY</span>
                    <span className="text-[10px] font-mono text-white/40">0.04ms / PROCESSING READY</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'STYLE' && (
            <motion.div 
              key="style"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center w-full max-w-6xl px-6 py-12 overflow-y-auto max-h-screen no-scrollbar"
            >
              <header className="text-center mb-12 max-w-2xl">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="h-px w-12 bg-primary-container/30"></div>
                  <span className="font-label text-primary-container text-xs tracking-[0.5em] uppercase">Cinematic Style Selection</span>
                  <div className="h-px w-12 bg-primary-container/30"></div>
                </div>
                <h1 className="font-headline text-4xl md:text-6xl font-extrabold tracking-tighter text-white uppercase italic leading-none">
                  PILIH STYLE
                </h1>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl">
                {STYLES.filter(s => s.category === 'cinematic').map((s) => (
                  <StyleCard 
                    key={s.id} 
                    style={s} 
                    selected={selectedStyle.id === s.id} 
                    onClick={() => setSelectedStyle(s)} 
                  />
                ))}
              </div>

              <div className="mt-16 w-full max-w-4xl flex flex-col items-center">
                <button 
                  onClick={() => setStep('PROCESSING')}
                  className="w-full py-6 bg-secondary-container text-secondary-fixed font-headline font-bold tracking-[0.3em] rounded-lg glow-purple hover:opacity-90 transition-all active:scale-[0.98] uppercase"
                >
                  INITIATE SWAP
                </button>
                
                <button 
                  onClick={() => setStep('CATEGORY')}
                  className="mt-8 font-headline text-on-surface-variant/60 text-[10px] tracking-[0.3em] uppercase flex items-center justify-center gap-4 group hover:text-primary-container transition-colors"
                >
                  <span className="w-12 h-[1px] bg-white/10 group-hover:bg-primary-container/30 transition-all"></span>
                  BACK TO MODE SELECTION
                  <span className="w-12 h-[1px] bg-white/10 group-hover:bg-primary-container/30 transition-all"></span>
                </button>

                <p className="text-[10px] font-headline text-gray-600 tracking-widest mt-8 text-center uppercase">
                  WARNING: IDENTITY OVERWRITE IN PROGRESS
                </p>
              </div>
            </motion.div>
          )}

          {step === 'PROCESSING' && (
            <motion.div 
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-16 w-full max-w-md px-6"
            >
              <div className="relative w-64 h-64">
                {/* Image Reference: Circular Loader */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="128"
                    cy="128"
                    r="110"
                    stroke="#1a1a1a"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <motion.circle
                    cx="128"
                    cy="128"
                    r="110"
                    stroke="#00ffff"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 110}
                    initial={{ strokeDashoffset: 2 * Math.PI * 110 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 110 - (2 * Math.PI * 110 * processingProgress) / 100 }}
                    transition={{ ease: "linear", duration: 0.1 }}
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-7xl font-headline font-black text-white leading-none tracking-tighter">
                    {processingProgress}<span className="text-4xl ml-1 text-white/70">%</span>
                  </span>
                  <motion.span 
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="text-sm font-mono font-bold text-[#00ffff] tracking-[0.4em] mt-3"
                  >
                    SYNCING
                  </motion.span>
                </div>
              </div>
              
              <div className="text-center space-y-6">
                <h3 className="text-3xl font-sans font-bold text-white uppercase tracking-[0.2em]">NEURAL SYNTHESIS</h3>
                <p className="text-[#00ffff] text-sm font-mono tracking-widest h-6">
                  {processingProgress < 20 && "INITIALIZING NEURAL LINK..."}
                  {processingProgress >= 20 && processingProgress < 40 && "CALIBRATING TACTICAL ASSETS..."}
                  {processingProgress >= 40 && processingProgress < 70 && "EXTRACTING UNIFORM GEOMETRY..."}
                  {processingProgress >= 70 && processingProgress < 95 && "INTEGRATING TNI ASSET..."}
                  {processingProgress >= 95 && "SYNTHESIS COMPLETE..."}
                </p>
              </div>
            </motion.div>
          )}

          {step === 'RESULT' && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center w-full max-w-5xl px-6 py-12 overflow-y-auto max-h-screen no-scrollbar"
            >
              <div className="relative w-full max-w-2xl group">
                <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-primary-container z-10"></div>
                <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-primary-container z-10"></div>
                <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-primary-container z-10"></div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-primary-container z-10"></div>
                
                <div className="w-full bg-surface-container-low overflow-hidden rounded shadow-[0_0_50px_rgba(0,0,0,0.8)] relative border border-outline-variant/30">
                  {resultImage ? (
                    <img 
                      src={resultImage} 
                      alt="Result" 
                      className="w-full h-auto block"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full aspect-[4/5] flex items-center justify-center bg-surface-container">
                      <Loader2 className="w-12 h-12 text-primary-container animate-spin" />
                    </div>
                  )}
                  
                  <div className="absolute bottom-4 left-4 glass-panel px-3 py-1.5 rounded-lg border border-outline-variant/30 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary-container" />
                    <span className="font-label text-[10px] font-bold tracking-widest text-primary">UNIFORM SWAP COMPLETE</span>
                  </div>
                  <div className="absolute top-4 right-4 text-right">
                    <div className="font-label text-[10px] text-primary-container/60 tracking-tighter">RENDER_STATUS: COMPLETE</div>
                    <div className="font-label text-[10px] text-primary-container/60 tracking-tighter">BITRATE: 48.2 MBPS</div>
                  </div>
                </div>
              </div>

              <div className="mt-12 w-full max-w-2xl flex flex-col gap-8">
                <div className="flex gap-4">
                  <button 
                    onClick={handleDownload}
                    className="flex-1 py-4 border-2 border-primary-container text-primary-container font-headline font-bold tracking-widest text-sm hover:bg-primary-container/10 transition-all flex items-center justify-center gap-2 uppercase"
                  >
                    <Download className="w-4 h-4" /> DOWNLOAD
                  </button>
                  <button 
                    onClick={handleShare}
                    disabled={isSharing}
                    className={cn(
                      "flex-1 py-4 font-headline font-bold tracking-widest text-sm transition-all flex items-center justify-center gap-2 uppercase glow-purple overflow-hidden",
                      isSharing 
                        ? "bg-secondary-container/50 text-secondary-fixed/50 cursor-not-allowed" 
                        : "bg-secondary-container text-secondary-fixed hover:opacity-80"
                    )}
                  >
                    {isSharing ? (
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> 
                          <span>PROVISIONING...</span>
                        </div>
                        <span className="text-[8px] opacity-60 mt-1 tracking-widest">{shareStatus}</span>
                      </div>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" /> SHARE
                      </>
                    )}
                  </button>
                </div>
                <button 
                  onClick={handleRetake}
                  className="font-headline text-tertiary-fixed-dim text-xs tracking-[0.3em] uppercase flex items-center justify-center gap-3 group hover:text-tertiary-fixed transition-colors"
                >
                  <span className="w-8 h-[1px] bg-tertiary-fixed-dim/30 group-hover:bg-tertiary-fixed/60 transition-all"></span>
                  RETAKE
                  <span className="w-8 h-[1px] bg-tertiary-fixed-dim/30 group-hover:bg-tertiary-fixed/60 transition-all"></span>
                </button>
              </div>
            </motion.div>
          )}

          {step === 'SHARE_VIEW' && sharedViewerImage && (
            <motion.div
              key="share-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center w-full px-6 py-12 h-full overflow-y-auto"
            >
              <div className="relative w-full max-w-2xl bg-surface-container-low border border-primary-container/20 overflow-hidden shadow-[0_0_50px_rgba(0,251,251,0.1)]">
                <img 
                  src={sharedViewerImage} 
                  alt="Shared Result" 
                  className="w-full max-h-[60vh] object-contain bg-black" 
                />
                <div className="absolute top-0 left-0 w-full p-6 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-primary-container" />
                    <span className="text-[10px] font-headline text-white tracking-[0.3em] uppercase">DECRYPTED DIGITAL ASSET</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col items-center gap-6 pb-12">
                <h2 className="text-2xl font-black font-headline text-white tracking-[0.4em] uppercase text-center">MISSION COMPLETE</h2>
                <div className="flex gap-4">
                  <a 
                    href={sharedViewerImage} 
                    download="intek-asset.png"
                    className="px-8 py-3 bg-primary-container text-black font-headline font-black text-xs tracking-widest rounded-none hover:bg-white transition-all uppercase"
                  >
                    DOWNLOAD ASSET
                  </a>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'ERROR' && (
            <motion.div 
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-8 text-center px-6 max-w-md relative"
            >
              {/* Tactical Error HUD Elements */}
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
              
              <div className="w-24 h-24 rounded-2xl bg-red-500/10 border-2 border-red-500/50 flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-red-500/20 animate-ping opacity-20"></div>
                <ShieldAlert className="w-12 h-12 text-red-500" />
              </div>

              <div className="space-y-6">
                <div>
                  <h2 className="text-4xl font-headline font-black text-red-500 tracking-tighter uppercase italic leading-none mb-2">
                    CRITICAL OVERLOAD
                  </h2>
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-px w-8 bg-red-500/30"></div>
                    <span className="font-label text-[10px] text-red-500/60 tracking-[0.3em] uppercase">Status: Resource Exhausted</span>
                    <div className="h-px w-8 bg-red-500/30"></div>
                  </div>
                </div>

                <div className="glass-panel p-6 border border-red-500/20 rounded-lg bg-red-500/5">
                  <p className="text-on-surface-variant text-sm font-mono leading-relaxed">
                    {errorMessage || "An unexpected error occurred during neural synthesis."}
                  </p>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <span className="font-label text-[10px] text-white/40 tracking-widest uppercase">System Cool-down</span>
                  <div className="text-5xl font-mono font-black text-white tracking-tighter">
                    00:{countdown.toString().padStart(2, '0')}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 w-full">
                <button 
                  disabled={countdown > 0}
                  onClick={() => setStep('PROCESSING')}
                  className={cn(
                    "w-full py-4 font-headline font-bold tracking-[0.2em] rounded-lg transition-all uppercase border",
                    countdown > 0 
                      ? "bg-white/5 border-white/10 text-white/20 cursor-not-allowed" 
                      : "bg-red-500 text-white border-red-400 hover:bg-red-600 active:scale-95 glow-red"
                  )}
                >
                  {countdown > 0 ? 'RECALIBRATING...' : 'RETRY SYNTHESIS'}
                </button>
                
                <button 
                  onClick={() => {
                    setResultImage(selectedUniform.image);
                    setStep('RESULT');
                  }}
                  className="w-full py-4 bg-primary-container/10 border border-primary-container/30 text-primary-container font-headline font-bold tracking-[0.2em] rounded-lg hover:bg-primary-container/20 transition-all uppercase text-xs"
                >
                  USE PREVIEW MODEL (SKIP AI)
                </button>

                <button 
                  onClick={() => setStep('CAMERA')}
                  className="w-full py-4 bg-white/5 border border-white/10 text-white/60 font-headline font-bold tracking-[0.2em] rounded-lg hover:bg-white/10 transition-all uppercase text-xs"
                >
                  ABORT MISSION
                </button>
              </div>

              {/* HUD Micro-details */}
              <div className="mt-8 grid grid-cols-2 gap-8 w-full border-t border-white/5 pt-6">
                <div className="text-left">
                  <div className="text-[8px] text-red-500/50 tracking-widest uppercase mb-1">ERROR_CODE</div>
                  <div className="text-[10px] font-mono text-white/40">0x429_LIMIT</div>
                </div>
                <div className="text-right">
                  <div className="text-[8px] text-red-500/50 tracking-widest uppercase mb-1">RECOVERY_EST</div>
                  <div className="text-[10px] font-mono text-white/40">{countdown}s</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Background Grid Overlay */}
      <div className="fixed inset-0 grid-overlay pointer-events-none opacity-40 z-0"></div>
      <div className="fixed inset-0 bg-glow pointer-events-none z-0"></div>

      {/* Tactical Share Modal */}
      <AnimatePresence>
        {showShareModal && shareUrl && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm glass-panel border border-primary-container/30 overflow-hidden"
            >
              {/* Tactical Borders */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary-container"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary-container"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary-container"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary-container"></div>

              <div className="p-8 flex flex-col items-center">
                <button 
                  onClick={() => setShowShareModal(false)}
                  className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 mb-8">
                  <div className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></div>
                  <h3 className="font-headline font-black text-white tracking-[0.3em] uppercase text-sm">ASSET RETRIEVAL</h3>
                </div>

                {/* QR Code Area */}
                <div className="relative p-4 bg-white rounded-lg shadow-[0_0_30px_rgba(0,251,251,0.2)] group">
                  <QRCodeSVG 
                    value={shareUrl} 
                    size={200} 
                    level="H"
                    includeMargin={false}
                    className="relative z-10"
                  />
                  <div className="absolute -inset-2 border border-primary-container/20 rounded-xl pointer-events-none"></div>
                </div>

                <div className="mt-8 space-y-4 w-full">
                  <div className="flex flex-col gap-1 border-l-2 border-primary-container pl-3 py-1">
                    <span className="text-[10px] font-headline text-primary-container tracking-widest uppercase opacity-60 font-bold">ASSET_ID</span>
                    <span className="text-xs font-mono text-white tracking-widest">{shareId}</span>
                  </div>
                  
                  <div className="flex flex-col gap-1 border-l-2 border-white/20 pl-3 py-1">
                    <span className="text-[10px] font-headline text-white/40 tracking-widest uppercase font-bold">EXPIRATION</span>
                    <span className="text-xs font-mono text-white/60 tracking-widest italic">24_HOUR_ENCRYPTED_LINK</span>
                  </div>
                </div>

                <p className="mt-8 text-[10px] font-label text-center leading-relaxed text-on-surface-variant tracking-widest uppercase">
                  SCAN UNIT WITH MOBILE DEVICE TO <br />
                  <span className="text-primary-container font-black">RETRIEVE DIGITAL ASSET</span>
                </p>

                <div className="mt-8 flex gap-3 w-full">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 2000);
                    }}
                    className="flex-1 py-3 bg-white/5 border border-white/10 flex items-center justify-center gap-2 hover:bg-white/10 transition-all rounded transition-all relative overflow-hidden"
                  >
                    <AnimatePresence mode="wait">
                      {isCopied ? (
                        <motion.div
                          key="check"
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -20, opacity: 0 }}
                          className="flex items-center gap-2"
                        >
                          <Check className="w-3.5 h-3.5 text-primary-container" />
                          <span className="text-[9px] font-headline font-bold text-primary-container tracking-widest uppercase">COPIED</span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="copy"
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -20, opacity: 0 }}
                          className="flex items-center gap-2"
                        >
                          <Copy className="w-3.5 h-3.5 text-white/60" />
                          <span className="text-[9px] font-headline font-bold text-white/60 tracking-widest uppercase">COPY LINK</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                  <a 
                    href={shareUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 py-3 bg-primary-container/10 border border-primary-container/30 flex items-center justify-center gap-2 hover:bg-primary-container/20 transition-all rounded"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-primary-container" />
                    <span className="text-[9px] font-headline font-bold text-primary-container tracking-widest uppercase">TEST LINK</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick, isSubItem = false }: { icon: any, label: string, active: boolean, onClick: () => void, isSubItem?: boolean }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "group cursor-pointer flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative",
        active ? "bg-primary-container/10" : "hover:bg-white/5",
        isSubItem && "py-2.5"
      )}
    >
      {active && (
        <motion.div 
          layoutId="activeIndicator"
          className="absolute left-0 w-1 h-6 bg-primary-container rounded-r-full shadow-[0_0_10px_rgba(0,251,251,0.5)]"
        />
      )}
      
      <div className={cn(
        "p-2 rounded-lg transition-all",
        active ? "text-primary-container" : "text-white/40 group-hover:text-white"
      )}>
        <Icon className={cn(isSubItem ? "w-4 h-4" : "w-5 h-5")} />
      </div>
      
      <span className={cn(
        "font-headline font-bold uppercase tracking-widest transition-all",
        isSubItem ? "text-sm" : "text-base",
        active ? "text-primary-container" : "text-on-surface-variant group-hover:text-white"
      )}>
        {label}
      </span>
      
      {active && (
        <div className="ml-auto">
          <div className="w-1.5 h-1.5 rounded-full bg-primary-container shadow-[0_0_8px_rgba(0,251,251,0.8)]"></div>
        </div>
      )}
    </div>
  );
}

function HUDButton({ icon: Icon, label }: { icon: any, label: string }) {
  return (
    <div className="bg-black/60 backdrop-blur-xl w-16 h-16 flex flex-col items-center justify-center rounded-lg border border-white/10 cursor-pointer group pointer-events-auto">
      <Icon className="w-6 h-6 text-primary-container group-hover:scale-110 transition-transform" />
      <span className="block font-label text-[7px] mt-1 text-primary-container/70 font-bold uppercase tracking-tighter">{label}</span>
    </div>
  );
}

interface UniformCardProps {
  key?: string | number;
  uniform: Uniform;
  selected: boolean;
  onClick: () => void;
}

function UniformCard({ uniform, selected, onClick }: UniformCardProps) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "flex-1 group cursor-pointer relative transition-all duration-500",
        selected ? "scale-[1.05] z-20" : "hover:scale-[1.02] opacity-70 hover:opacity-100"
      )}
    >
      {selected && <div className="absolute -inset-1 bg-primary-container/20 blur-md rounded-lg"></div>}
      <div className={cn(
        "relative h-[450px] bg-surface-container-low overflow-hidden transition-all duration-500 border",
        selected ? "border-primary-container shadow-[0_0_40px_rgba(0,251,251,0.25)]" : "border-outline-variant/30"
      )}>
        <img src={uniform.image} alt={uniform.name} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
        
        {selected && (
          <div className="absolute top-6 right-6 flex items-center gap-2 bg-primary-container px-3 py-1">
            <span className="text-[10px] font-bold font-headline text-black tracking-widest uppercase">SELECTED</span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 w-full p-6">
          <span className="text-[10px] font-headline text-primary-container/70 tracking-widest mb-1 block uppercase">ASSET ID: {uniform.assetId}</span>
          <h3 className="text-2xl font-bold font-headline text-white uppercase">{uniform.name}</h3>
          <p className="text-xs text-on-surface-variant font-body mt-2">{uniform.description}</p>
        </div>

        {/* Tactical Corners */}
        <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-primary-container/30"></div>
        <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-primary-container/30"></div>
      </div>
    </div>
  );
}

interface StyleCardProps {
  key?: string | number;
  style: any;
  selected: boolean;
  onClick: () => void;
}

function StyleCard({ style, selected, onClick }: StyleCardProps) {
  const Icon = style.icon;
  const displayImage = style.thumbnail || style.image;
  
  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative border transition-all duration-500 rounded-lg overflow-hidden glass-panel cursor-pointer h-full min-h-[400px]",
        selected ? "border-primary-container glow-cyan" : "border-outline-variant/30 hover:border-primary-container/50"
      )}
    >
      {displayImage && (
        <>
          <img 
            src={displayImage} 
            alt={style.name} 
            className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" 
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
        </>
      )}
      <div className="p-8 flex flex-col h-full relative z-10">
        <div className="mb-8 flex justify-between items-start">
          <div className={cn("p-4 rounded-lg", selected ? "bg-primary-container/20" : "bg-primary-container/10")}>
            <Icon className={cn("w-8 h-8", selected ? "text-primary-container" : "text-primary-container/60")} />
          </div>
          <span className="font-label text-[10px] text-on-surface-variant tracking-widest opacity-50 uppercase">ID: {style.assetId}</span>
        </div>
        
        <div className="mt-auto">
          <h2 className={cn("font-headline text-2xl font-black mb-2 tracking-tight transition-colors leading-none", selected ? "text-primary-container" : "text-white")}>
            {style.name}
          </h2>
          <h3 className="font-label text-primary-container text-[10px] font-bold tracking-[0.2em] mb-4 uppercase">{style.subtitle}</h3>
          <p className="text-on-surface-variant font-body text-xs leading-relaxed max-w-xs">
            {style.description}
          </p>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <div className="flex gap-2">
            {style.tags.map((tag: string) => (
              <span key={tag} className="bg-surface-container-highest text-on-surface text-[8px] px-2 py-0.5 rounded font-bold tracking-wider uppercase">
                {tag}
              </span>
            ))}
          </div>
          {selected && <Check className="w-5 h-5 text-primary-container" />}
        </div>
      </div>
    </div>
  );
}
