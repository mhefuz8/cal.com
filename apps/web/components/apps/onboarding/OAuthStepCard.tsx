import type { FC } from "react";
import React from "react";

import type { SVGComponent } from "@calcom/types/SVGComponent";
import { Button, StepCard } from "@calcom/ui";

type OAuthCardProps = {
  description: string;
  name: string;
  logo: string;
  onClick: () => void;
};

const Logo: SVGComponent = ({ href, className }) => {
  return <img src={href} alt="app logo" className={className} />;
};

export const OAuthStepCard: FC<OAuthCardProps> = ({ description, name, logo, onClick }) => {
  const Logo: SVGComponent = (className) => <img src={logo} alt="app logo" className="mr-2 h-6 w-6" />;
  return (
    <StepCard>
      <div className="flex flex-col gap-4">
        <p>{description}</p>
        <Button className="min-w-20 w-fit justify-center self-center" StartIcon={Logo} onClick={onClick}>
          Connect With {name}
        </Button>
      </div>
    </StepCard>
  );
};
