import { PlatformSosmed, ContentFormatSosmed, GaleriSosmedItem } from '@/types/galeri-sosmed';

export interface ParsedSosmedUrlResult {
  isValid: boolean;
  platform: PlatformSosmed;
  embedId: string;
  contentFormat: ContentFormatSosmed;
  embedIframeUrl: string;
  autoThumbnailUrl?: string;
}

/**
 * Mengekstrak informasi platform, ID konten, format rasio (16:9 vs 9:16),
 * URL iframe resmi, dan thumbnail otomatis dari URL YouTube, Instagram, atau TikTok.
 */
export function parseSosmedUrl(rawUrl: string): ParsedSosmedUrlResult {
  const trimmed = (rawUrl || '').trim();
  const fallback: ParsedSosmedUrlResult = {
    isValid: false,
    platform: 'youtube',
    embedId: '',
    contentFormat: 'vertical',
    embedIframeUrl: '',
  };

  if (!trimmed) return fallback;

  const lower = trimmed.toLowerCase();

  // 1. Deteksi YouTube (watch?v=, youtu.be/, youtube.com/shorts/, youtube.com/embed/, youtube.com/live/)
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    let videoId = '';
    let format: ContentFormatSosmed = 'landscape';

    const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,20})/i);
    if (shortsMatch && shortsMatch[1]) {
      videoId = shortsMatch[1];
      format = 'vertical';
    }

    if (!videoId) {
      const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{6,20})/i);
      if (watchMatch && watchMatch[1]) {
        videoId = watchMatch[1];
      }
    }

    if (!videoId) {
      const shortUrlMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{6,20})/i);
      if (shortUrlMatch && shortUrlMatch[1]) {
        videoId = shortUrlMatch[1];
      }
    }

    if (!videoId) {
      const embedMatch = trimmed.match(/youtube\.com\/(?:embed|live)\/([a-zA-Z0-9_-]{6,20})/i);
      if (embedMatch && embedMatch[1]) {
        videoId = embedMatch[1];
      }
    }

    if (videoId) {
      return {
        isValid: true,
        platform: 'youtube',
        embedId: videoId,
        contentFormat: format,
        embedIframeUrl: `https://www.youtube.com/embed/${videoId}?rel=0`,
        autoThumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      };
    }
  }

  // 2. Deteksi Instagram (reel/, reels/, p/, tv/)
  if (lower.includes('instagram.com') || lower.includes('instagr.am')) {
    const igMatch = trimmed.match(/instagram\.com\/(?:[^/]+\/)?(reel|reels|p|tv)\/([a-zA-Z0-9_-]+)/i);
    if (igMatch && igMatch[2]) {
      const kind = igMatch[1].toLowerCase();
      const shortcode = igMatch[2];
      const isReel = kind === 'reel' || kind === 'reels' || kind === 'tv';
      const pathKind = isReel ? 'reel' : 'p';
      return {
        isValid: true,
        platform: 'instagram',
        embedId: shortcode,
        contentFormat: isReel ? 'vertical' : 'post',
        embedIframeUrl: `https://www.instagram.com/${pathKind}/${shortcode}/embed/`,
      };
    }
  }

  // 3. Deteksi TikTok (tiktok.com/@user/video/1234567890)
  if (lower.includes('tiktok.com')) {
    const ttMatch = trimmed.match(/\/video\/(\d+)/i);
    const videoId = ttMatch?.[1] || '';
    if (videoId) {
      return {
        isValid: true,
        platform: 'tiktok',
        embedId: videoId,
        contentFormat: 'vertical',
        embedIframeUrl: `https://www.tiktok.com/player/v1/${videoId}?music_info=1&description=1`,
      };
    }
  }

  return fallback;
}

/**
 * Membangun URL iframe embed resmi dari item GaleriSosmedItem
 */
export function buildSosmedEmbedUrl(
  item: Pick<GaleriSosmedItem, 'platform' | 'embed_id' | 'source_url' | 'content_format'>
): string {
  const parsed = parseSosmedUrl(item.source_url);
  if (parsed.isValid && parsed.embedIframeUrl) {
    return parsed.embedIframeUrl;
  }

  const cleanId = (item.embed_id || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
  if (!cleanId) return '';

  if (item.platform === 'youtube') {
    return `https://www.youtube.com/embed/${cleanId}?rel=0`;
  }
  if (item.platform === 'tiktok') {
    return `https://www.tiktok.com/player/v1/${cleanId}?music_info=1&description=1`;
  }
  if (item.platform === 'instagram') {
    const pathKind = item.content_format === 'post' ? 'p' : 'reel';
    return `https://www.instagram.com/${pathKind}/${cleanId}/embed/`;
  }
  return '';
}
