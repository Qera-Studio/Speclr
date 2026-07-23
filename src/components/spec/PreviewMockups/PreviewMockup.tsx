import type { PreviewMockupKind } from '@/lib/spec/types';
import BrowserTabMockup from './BrowserTabMockup';
import IOSHomeScreenMockup from './IOSHomeScreenMockup';
import MaskableSafeZoneMockup from './MaskableSafeZoneMockup';
import GoogleSerpMockup from './GoogleSerpMockup';
import SocialCardMockup from './SocialCardMockup';

interface PreviewMockupProps {
  kind: PreviewMockupKind;
  imageUrl: string;
  alt: string;
}

export default function PreviewMockup({ kind, imageUrl, alt }: PreviewMockupProps) {
  switch (kind) {
    case 'browserTab':
      return <BrowserTabMockup imageUrl={imageUrl} alt={alt} />;
    case 'iosHomeScreen':
      return <IOSHomeScreenMockup imageUrl={imageUrl} alt={alt} />;
    case 'maskableSafeZone':
      return <MaskableSafeZoneMockup imageUrl={imageUrl} alt={alt} />;
    case 'googleSerp':
      return <GoogleSerpMockup imageUrl={imageUrl} alt={alt} />;
    case 'socialCard':
      return <SocialCardMockup imageUrl={imageUrl} alt={alt} />;
    case 'none':
    default:
      return null;
  }
}
