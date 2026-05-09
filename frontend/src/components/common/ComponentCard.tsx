import type { ReactNode } from "react";
import Card from "../system/Card";

interface ComponentCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  desc?: string;
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  children,
  className = "",
  desc = "",
}) => {
  return (
    <Card title={title} description={desc} className={className} bodyClassName="space-y-6">
      {children}
    </Card>
  );
};

export default ComponentCard;
