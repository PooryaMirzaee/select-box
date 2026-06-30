"use client";

/**
 * پک آیکون لوکال CORALAY — Phosphor Bold (بروتالیست)
 */
import {
  AlignCenterHorizontal as PhAlignCenterHorizontal,
  ArrowLeft as PhArrowLeft,
  ArrowSquareOut as PhArrowSquareOut,
  CaretDown as PhCaretDown,
  CaretLeft as PhCaretLeft,
  CaretUp as PhCaretUp,
  ChartLine as PhChartLine,
  ChartBar as PhChartBar,
  ChatsCircle as PhChatsCircle,
  Check as PhCheck,
  CircleNotch as PhCircleNotch,
  Coffee as PhCoffee,
  Copy as PhCopy,
  Eye as PhEye,
  FlipHorizontal as PhFlipHorizontal,
  FolderPlus as PhFolderPlus,
  Folders as PhFolders,
  Gear as PhGear,
  House as PhHouse,
  ImageSquare as PhImageSquare,
  List as PhList,
  Minus as PhMinus,
  Moon as PhMoon,
  PaperPlaneTilt as PhPaperPlaneTilt,
  Package as PhPackage,
  Phone as PhPhone,
  EnvelopeSimple as PhEnvelopeSimple,
  Clock as PhClock,
  MapPin as PhMapPin,
  InstagramLogo as PhInstagramLogo,
  TelegramLogo as PhTelegramLogo,
  WhatsappLogo as PhWhatsappLogo,
  Palette as PhPalette,
  PenNib as PhPenNib,
  Newspaper as PhNewspaper,
  PencilSimple as PhPencilSimple,
  Plus as PhPlus,
  ShoppingBag as PhShoppingBag,
  ShoppingCart as PhShoppingCart,
  SignOut as PhSignOut,
  MagicWand as PhMagicWand,
  Sparkle as PhSparkle,
  SquaresFour as PhSquaresFour,
  Sun as PhSun,
  Tag as PhTag,
  TextT as PhTextT,
  Trash as PhTrash,
  TShirt as PhTShirt,
  Upload as PhUpload,
  User as PhUser,
  X as PhX,
  FloppyDisk as PhFloppyDisk,
} from "@phosphor-icons/react";

import { createIcon, type BrutalIconProps } from "./createIcon";
import { cn } from "@/lib/utils";

export type { BrutalIconProps };

export const Menu = createIcon(PhList);
export const ShoppingBag = createIcon(PhShoppingBag);
export const Moon = createIcon(PhMoon);
export const Sun = createIcon(PhSun);
export const ArrowLeft = createIcon(PhArrowLeft);
export const AlignCenter = createIcon(PhAlignCenterHorizontal);
export const Trash2 = createIcon(PhTrash);
export const Grid3X3 = createIcon(PhSquaresFour);
export const Home = createIcon(PhHouse);
export const User = createIcon(PhUser);
export const Palette = createIcon(PhPalette);
export const Sparkles = createIcon(PhSparkle);
export const Wand = createIcon(PhMagicWand);
export const Upload = createIcon(PhUpload);
export const X = createIcon(PhX);
export const ChevronLeft = createIcon(PhCaretLeft);
export const ChevronDown = createIcon(PhCaretDown);
export const ChevronUp = createIcon(PhCaretUp);
export const Check = createIcon(PhCheck);
export const ExternalLink = createIcon(PhArrowSquareOut);
export const FolderTree = createIcon(PhFolders);
export const MessageCircle = createIcon(PhChatsCircle);
export const LayoutDashboard = createIcon(PhChartBar);
export const BarChart3 = createIcon(PhChartLine);
export const Send = createIcon(PhPaperPlaneTilt);
export const Package = createIcon(PhPackage);
export const Phone = createIcon(PhPhone);
export const Mail = createIcon(PhEnvelopeSimple);
export const Clock = createIcon(PhClock);
export const MapPin = createIcon(PhMapPin);
export const Instagram = createIcon(PhInstagramLogo);
export const Telegram = createIcon(PhTelegramLogo);
export const Whatsapp = createIcon(PhWhatsappLogo);
export const PenTool = createIcon(PhPenNib);
export const Newspaper = createIcon(PhNewspaper);
export const Settings = createIcon(PhGear);
export const ShoppingCart = createIcon(PhShoppingCart);
export const Tag = createIcon(PhTag);
export const LogOut = createIcon(PhSignOut);
export const FolderPlus = createIcon(PhFolderPlus);
export const Pencil = createIcon(PhPencilSimple);
export const Copy = createIcon(PhCopy);
export const Eye = createIcon(PhEye);
export const FlipHorizontal2 = createIcon(PhFlipHorizontal);
export const ImagePlus = createIcon(PhImageSquare);
export const Minus = createIcon(PhMinus);
export const Plus = createIcon(PhPlus);
export const Save = createIcon(PhFloppyDisk);
export const Shirt = createIcon(PhTShirt);
export const Type = createIcon(PhTextT);
export const Coffee = createIcon(PhCoffee);

export function Loader2({ className, size = 20, ...props }: BrutalIconProps) {
  return (
    <PhCircleNotch
      weight="bold"
      size={size}
      className={cn("shrink-0 animate-spin", className)}
      {...props}
    />
  );
}
