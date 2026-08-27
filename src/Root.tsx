import "./index.css";
import { MyComposition } from "./Composition";
import { BarChartCompositions } from "./BarChartCompositions";
import { PillarBurstCompositions } from "./PillarBurstCompositions";
import { MarqueeCompositions } from "./MarqueeCompositions";
import { TypewriterCompositions } from "./TypewriterCompositions";
import { DiagonalWipeCompositions } from "./DiagonalWipeCompositions";
import { SlamCompositions } from "./SlamCompositions";
import { DrawOnCompositions } from "./DrawOnCompositions";
import { OdometerCompositions } from "./OdometerCompositions";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <BarChartCompositions />
      <PillarBurstCompositions />
      <MarqueeCompositions />
      <TypewriterCompositions />
      <DiagonalWipeCompositions />
      <SlamCompositions />
      <DrawOnCompositions />
      <OdometerCompositions />
    </>
  );
};
