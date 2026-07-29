import type { PreviewMockupKind } from '@/lib/spec/types';
import BrowserTabMockup from './BrowserTabMockup';
import BookmarksBarMockup from './BookmarksBarMockup';
import SafariPinnedTabMockup from './SafariPinnedTabMockup';
import IOSHomeScreenMockup from './IOSHomeScreenMockup';
import MaskableSafeZoneMockup from './MaskableSafeZoneMockup';
import GoogleSerpMockup from './GoogleSerpMockup';
import SocialCardMockup from './SocialCardMockup';
import AndroidLauncherMockup from './AndroidLauncherMockup';
import PwaInstallMockup from './PwaInstallMockup';

interface PreviewMockupProps {
  kind: PreviewMockupKind;
  /** Uploaded asset URL; optional for template contexts (e.g. the browser tab before upload). */
  imageUrl?: string;
  alt: string;
  /** Client/project name, surfaced in contexts that show a brand label (e.g. the browser tab). */
  brandName?: string;
  /** Website/domain, surfaced wherever a URL appears (address bar, SERP, social card). */
  domain?: string;
}

export default function PreviewMockup({ kind, imageUrl, alt, brandName, domain }: PreviewMockupProps) {
  switch (kind) {
    case 'browserTab':
      return <BrowserTabMockup imageUrl={imageUrl} alt={alt} brandName={brandName} domain={domain} />;
    case 'bookmarksBar':
      return <BookmarksBarMockup imageUrl={imageUrl} alt={alt} brandName={brandName} />;
    case 'safariPinnedTab':
      return <SafariPinnedTabMockup imageUrl={imageUrl} alt={alt} brandName={brandName} />;
    case 'iosHomeScreen':
      return <IOSHomeScreenMockup imageUrl={imageUrl} alt={alt} brandName={brandName} />;
    case 'maskableSafeZone':
      return <MaskableSafeZoneMockup imageUrl={imageUrl ?? ''} alt={alt} />;
    case 'googleSerp':
      return <GoogleSerpMockup imageUrl={imageUrl} alt={alt} brandName={brandName} domain={domain} />;
    case 'socialCard':
      return <SocialCardMockup imageUrl={imageUrl ?? ''} alt={alt} brandName={brandName} domain={domain} />;
    case 'socialCardSquare':
      // The square OG variant is 1200x1200; rendering it in the landscape frame
      // letterboxes a correct upload and makes it read as wrong.
      return <SocialCardMockup imageUrl={imageUrl ?? ''} alt={alt} brandName={brandName} domain={domain} square />;
    case 'androidLauncher':
      return <AndroidLauncherMockup imageUrl={imageUrl} alt={alt} brandName={brandName} />;
    case 'pwaInstall':
      return <PwaInstallMockup imageUrl={imageUrl} alt={alt} brandName={brandName} domain={domain} />;
    case 'none':
    default:
      return null;
  }
}
