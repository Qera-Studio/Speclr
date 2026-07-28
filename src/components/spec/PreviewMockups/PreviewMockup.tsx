import type { PreviewMockupKind } from '@/lib/spec/types';
import BrowserTabMockup from './BrowserTabMockup';
import BookmarksBarMockup from './BookmarksBarMockup';
import IOSHomeScreenMockup from './IOSHomeScreenMockup';
import MaskableSafeZoneMockup from './MaskableSafeZoneMockup';
import GoogleSerpMockup from './GoogleSerpMockup';
import SocialCardMockup from './SocialCardMockup';

interface PreviewMockupProps {
  kind: PreviewMockupKind;
  /** Uploaded asset URL; optional for template contexts (e.g. the browser tab before upload). */
  imageUrl?: string;
  alt: string;
  /** Client/project name, surfaced in contexts that show a brand label (e.g. the browser tab). */
  brandName?: string;
}

export default function PreviewMockup({ kind, imageUrl, alt, brandName }: PreviewMockupProps) {
  switch (kind) {
    case 'browserTab':
      return <BrowserTabMockup imageUrl={imageUrl} alt={alt} brandName={brandName} />;
    case 'bookmarksBar':
      return <BookmarksBarMockup imageUrl={imageUrl} alt={alt} brandName={brandName} />;
    case 'iosHomeScreen':
      return <IOSHomeScreenMockup imageUrl={imageUrl ?? ''} alt={alt} />;
    case 'maskableSafeZone':
      return <MaskableSafeZoneMockup imageUrl={imageUrl ?? ''} alt={alt} />;
    case 'googleSerp':
      return <GoogleSerpMockup imageUrl={imageUrl ?? ''} alt={alt} />;
    case 'socialCard':
      return <SocialCardMockup imageUrl={imageUrl ?? ''} alt={alt} />;
    case 'none':
    default:
      return null;
  }
}
