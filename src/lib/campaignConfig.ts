import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "./firebase";

export const TOTAL_MILES = 78;

export interface Campaign {
  number: number;
  name: string;
  subtitle: string;
  milesRequired: number;
  startVideo: string;
  endVideo: string;
  startVideoFallback?: string;
  endVideoFallback?: string;
  startVideoStoragePath?: string;
  endVideoStoragePath?: string;
  image: string;
  description: string;
}

export const CAMPAIGNS: Campaign[] = [
  {
    number: 1,
    name: "The Beginning",
    subtitle: "Mars God of War",
    milesRequired: 1,
    startVideo: "/mars-welcome.mp4",
    endVideo: "/mars-complete.mp4",
    startVideoStoragePath: "campaign-videos/mars-welcome.mp4",
    endVideoStoragePath: "campaign-videos/mars-complete.mp4",
    image: "/campaigns/mars.png",
    description:
      "Every warrior's journey begins with a single step. Mars, the God of War, watches over those brave enough to take the first stride. Complete your first mile and prove you are worthy of the path ahead.",
  },
  {
    number: 2,
    name: "The Foundations",
    subtitle: "Romulus & Remus",
    milesRequired: 2,
    startVideo: "/TUWC/romulus-welcome.mp4",
    endVideo: "/TUWC/romulus-complete.mp4",
    startVideoStoragePath: "campaign-videos/romulus-welcome.mp4",
    endVideoStoragePath: "campaign-videos/romulus-complete.mp4",
    image: "/campaigns/romulus.png",
    description:
      "Twin brothers raised by wolves founded the greatest civilisation the world has ever known. Like Romulus and Remus, you must build strong foundations. Run 2 miles to lay the first stones of your empire.",
  },
  {
    number: 3,
    name: "The Emperor",
    subtitle: "Augustus",
    milesRequired: 3,
    startVideo: "/TUWC/Augustus-welcome.mp4",
    endVideo: "/TUWC/Augustus-complete.mp4",
    startVideoStoragePath: "campaign-videos/Augustus-welcome.mp4",
    endVideoStoragePath: "campaign-videos/Augustus-complete.mp4",
    image: "/campaigns/augustus.png",
    description:
      "Augustus transformed Rome from a republic into an unstoppable empire. To follow in his footsteps, you must show discipline and endurance. Conquer 3 miles to claim the imperial mantle.",
  },
  {
    number: 4,
    name: "The Legion",
    subtitle: "Domination of the Roman Army",
    milesRequired: 4,
    startVideo: "/TUWC/the-legion-welcome.mp4",
    endVideo: "/TUWC/legion-complete.mp4",
    startVideoStoragePath: "campaign-videos/the-legion-welcome.mp4",
    endVideoStoragePath: "campaign-videos/legion-complete.mp4",
    image: "/campaigns/legion.png",
    description:
      "The Roman Legion was the most feared fighting force in the ancient world. Discipline, formation, and relentless marching made them unstoppable. Push through 4 miles and earn your place in the ranks.",
  },
  {
    number: 5,
    name: "The Empire",
    subtitle: "Trajan",
    milesRequired: 5,
    startVideo: "/TUWC/trajan-welcome.mp4",
    endVideo: "/TUWC/trajan-complete.mp4",
    startVideoStoragePath: "campaign-videos/trajan-welcome.mp4",
    endVideoStoragePath: "campaign-videos/trajan-complete.mp4",
    image: "/campaigns/Trajan1.jpg",
    description:
      "Under Trajan, the Roman Empire reached its greatest territorial extent. His campaigns stretched across mountains and deserts. Cover 5 miles to expand the borders of your own empire.",
  },
  {
    number: 6,
    name: "The Hero",
    subtitle: "Markus Aurelius",
    milesRequired: 6,
    startVideo: "/TUWC/aurelius-welcome.mp4",
    endVideo: "/TUWC/Aurelius-complete.mp4",
    startVideoStoragePath: "campaign-videos/aurelius-welcome.mp4",
    endVideoStoragePath: "campaign-videos/Aurelius-complete.mp4",
    image: "/campaigns/aurelius.png",
    description:
      "Marcus Aurelius, the philosopher emperor, believed strength comes from within. He led from the front lines while writing his Meditations. Run 6 miles with the wisdom and courage of a true hero.",
  },
  {
    number: 7,
    name: "The Wall",
    subtitle: "Hadrian",
    milesRequired: 7,
    startVideo: "/TUWC/Hadrian-welcome.mp4",
    endVideo: "/TUWC/Hadrian-complete.mp4",
    startVideoStoragePath: "campaign-videos/Hadrian-welcome.mp4",
    endVideoStoragePath: "campaign-videos/Hadrian-complete.mp4",
    image: "/campaigns/Hadrian6.jpg",
    description:
      "Hadrian built a wall that stretched 73 miles across Britannia - a monument to Roman engineering and determination. Push through 7 miles and build your own unbreakable barrier.",
  },
  {
    number: 8,
    name: "The Restorer of The World",
    subtitle: "Aurelian",
    milesRequired: 8,
    startVideo: "/TUWC/aurelian-welcome.mp4",
    endVideo: "/TUWC/aurelian-complete.mp4",
    startVideoStoragePath: "campaign-videos/aurelian-welcome.mp4",
    endVideoStoragePath: "campaign-videos/aurelian-complete.mp4",
    image: "/campaigns/Aurelian7.jpg",
    description:
      "When the empire was fracturing, Aurelian reunited it through sheer force of will. He earned the title Restitutor Orbis - Restorer of the World. Complete 8 miles to restore your own strength.",
  },
  {
    number: 9,
    name: "The Enemy",
    subtitle: "Hannibal",
    milesRequired: 9,
    startVideo: "/TUWC/hannibal-welcome.mp4",
    endVideo: "/TUWC/Hannibal-complete.mp4",
    startVideoStoragePath: "campaign-videos/hannibal-welcome.mp4",
    endVideoStoragePath: "campaign-videos/Hannibal-complete.mp4",
    image: "/campaigns/Hannibal3.jpg",
    description:
      "Hannibal Barca marched elephants across the Alps to strike at the heart of Rome. He was the greatest enemy Rome ever faced. Endure 9 miles and prove you can overcome any obstacle in your path.",
  },
  {
    number: 10,
    name: "The Gladiator",
    subtitle: "Spartacus",
    milesRequired: 10,
    startVideo: "/TUWC/spartacus-welcome.mp4",
    endVideo: "/TUWC/spartacus-complete.mp4",
    startVideoStoragePath: "campaign-videos/spartacus-welcome.mp4",
    endVideoStoragePath: "campaign-videos/spartacus-complete.mp4",
    image: "/campaigns/Spartacus5.jpg",
    description:
      "Spartacus rose from slavery to lead the greatest rebellion Rome had ever seen. His courage inspired thousands to fight for freedom. Push through 10 miles with the heart of a gladiator.",
  },
  {
    number: 11,
    name: "The Fall of Rome",
    subtitle: "Barbarian Invasion",
    milesRequired: 11,
    startVideo: "/TUWC/fall-of-rome-welcome.mp4",
    endVideo: "/TUWC/fall-of-rome-complete.mp4",
    startVideoStoragePath: "campaign-videos/fall-of-rome-welcome.mp4",
    endVideoStoragePath: "campaign-videos/fall-of-rome-complete.mp4",
    image: "/campaigns/TheFallofRome2.jpg",
    description:
      "The barbarian hordes descended on Rome from every direction. Only the strongest warriors survived the fall. Fight through 11 miles and prove you can endure when all seems lost.",
  },
  {
    number: 12,
    name: "The Voice of Rome",
    subtitle: "Julius Caesar",
    milesRequired: 12,
    startVideo: "/TUWC/julius-welcome.mp4",
    endVideo: "/TUWC/julius-complete.mp4",
    startVideoStoragePath: "campaign-videos/julius-welcome.mp4",
    endVideoStoragePath: "campaign-videos/julius-complete.mp4",
    image: "/campaigns/julius.png",
    description:
      "Julius Caesar conquered Gaul, crossed the Rubicon, and changed the world forever. He is the ultimate warrior. Complete the final 12 miles and cement your legacy as a true champion of Rome.",
  },
];

const campaignVideoUrlCache = new Map<string, string>();

function getVideoCandidatePaths(storagePath: string | undefined): string[] {
  if (!storagePath) return [];

  return [storagePath];
}

/**
 * Resolve a campaign video from Firebase Storage with fallback to bundled assets.
 * URLs are cached to avoid repeated Storage API calls for the same file.
 */
export async function resolveVideoUrl(
  storagePath: string | undefined,
  fallbackSrc: string
): Promise<string> {
  const candidatePaths = getVideoCandidatePaths(storagePath);
  if (candidatePaths.length === 0) return fallbackSrc;

  for (const candidatePath of candidatePaths) {
    const cachedUrl = campaignVideoUrlCache.get(candidatePath);
    if (cachedUrl) {
      return cachedUrl;
    }

    try {
      const downloadUrl = await getDownloadURL(ref(storage, candidatePath));
      campaignVideoUrlCache.set(candidatePath, downloadUrl);
      return downloadUrl;
    } catch {
      continue;
    }
  }

  console.warn(`Falling back to bundled campaign video for ${storagePath}.`);
  return fallbackSrc;
}

/**
 * Round miles to one decimal place.
 */
export function roundMiles(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Get the medal name for a campaign by number.
 */
export function getCampaignMedalName(campaignNumber: number): string {
  const campaign = CAMPAIGNS[campaignNumber - 1];
  return campaign ? `${campaign.name} Medal` : "Warrior Medal";
}
