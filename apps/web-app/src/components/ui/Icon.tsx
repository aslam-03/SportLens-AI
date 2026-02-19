/**
 * Icon Component - Production Grade
 * 
 * Wrapper for lucide-react icons with consistent sizing and stroke width.
 * All icons are 20-24px with uniform 2px stroke.
 */

import {
  Home,
  Video,
  History,
  User,
  Settings,
  LogOut,
  Camera,
  Play,
  Square,
  Download,
  Upload,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  Menu,
  BarChart3,
  TrendingUp,
  Activity,
  Clock,
  Calendar,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Share2,
  Eye,
  EyeOff,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface IconProps {
  size?: IconSize;
  className?: string;
}

// Consistent sizing - 20-24px standard
const iconSizes: Record<IconSize, number> = {
  xs: 16,
  sm: 18,
  md: 20, // Standard for UI
  lg: 24, // Standard for headers
  xl: 28,
};

// Icon wrapper with consistent styling
const createIcon = (LucideIcon: LucideIcon) => {
  return ({ size = 'md', className }: IconProps) => (
    <LucideIcon
      size={iconSizes[size]}
      strokeWidth={2}
      className={cn('flex-shrink-0', className)}
    />
  );
};

// Export all icons with consistent branding
export const Icons = {
  // Navigation
  Home: createIcon(Home),
  Video: createIcon(Video),
  History: createIcon(History),
  User: createIcon(User),
  Settings: createIcon(Settings),
  LogOut: createIcon(LogOut),
  
  // Actions
  Camera: createIcon(Camera),
  Play: createIcon(Play),
  Stop: createIcon(Square),
  Download: createIcon(Download),
  Upload: createIcon(Upload),
  
  // UI Elements
  Menu: createIcon(Menu),
  X: createIcon(X),
  ChevronRight: createIcon(ChevronRight),
  ChevronDown: createIcon(ChevronDown),
  ChevronLeft: createIcon(ChevronLeft),
  MoreVertical: createIcon(MoreVertical),
  
  // Status/Feedback
  AlertTriangle: createIcon(AlertTriangle),
  Warning: createIcon(AlertTriangle), // Alias for consistency
  CheckCircle: createIcon(CheckCircle),
  Check: createIcon(CheckCircle), // Alias for consistency
  Info: createIcon(Info),
  
  // Data/Analytics
  BarChart: createIcon(BarChart3),
  TrendingUp: createIcon(TrendingUp),
  Activity: createIcon(Activity),
  
  // Utility
  Clock: createIcon(Clock),
  Calendar: createIcon(Calendar),
  Search: createIcon(Search),
  Filter: createIcon(Filter),
  Edit: createIcon(Edit),
  Trash: createIcon(Trash2),
  Share: createIcon(Share2),
  Eye: createIcon(Eye),
  EyeOff: createIcon(EyeOff),
} as const;

// Export individual icons for tree-shaking
export {
  Home,
  Video,
  History,
  User,
  Settings,
  LogOut,
  Camera,
  Play,
  Square as Stop,
  Download,
  Upload,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  AlertTriangle,
  CheckCircle,
  Info,
  BarChart3,
  TrendingUp,
  Activity,
  Clock,
  Calendar,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Share2,
  Eye,
  EyeOff,
};

// Default export for convenience
export default Icons;
