import React from 'react';
import {
  Home,
  Utensils,
  Car,
  HeartPulse,
  Sparkles,
  GraduationCap,
  CreditCard,
  TrendingUp,
  Tag,
  CircleDollarSign,
  Repeat,
  Layers,
} from 'lucide-react';

interface CategoryIconProps {
  iconName: string;
  className?: string;
  color?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ iconName, className = 'w-5 h-5', color }) => {
  const iconProps = {
    className,
    style: color ? { color } : undefined,
  };

  switch (iconName) {
    case 'Home':
      return <Home {...iconProps} />;
    case 'Utensils':
      return <Utensils {...iconProps} />;
    case 'Car':
      return <Car {...iconProps} />;
    case 'HeartPulse':
      return <HeartPulse {...iconProps} />;
    case 'Sparkles':
      return <Sparkles {...iconProps} />;
    case 'GraduationCap':
      return <GraduationCap {...iconProps} />;
    case 'CreditCard':
      return <CreditCard {...iconProps} />;
    case 'TrendingUp':
      return <TrendingUp {...iconProps} />;
    case 'CircleDollarSign':
      return <CircleDollarSign {...iconProps} />;
    case 'Repeat':
      return <Repeat {...iconProps} />;
    case 'Layers':
      return <Layers {...iconProps} />;
    default:
      return <Tag {...iconProps} />;
  }
};
