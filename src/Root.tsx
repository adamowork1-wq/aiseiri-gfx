import "./index.css";
import { MyComposition } from "./Composition";
import { BarChartCompositions } from "./BarChartCompositions";
import { PillarBurstCompositions } from "./PillarBurstCompositions";
import { MarqueeCompositions } from "./MarqueeCompositions";
import { TypewriterCompositions } from "./TypewriterCompositions";
import { DiagonalWipeCompositions } from "./DiagonalWipeCompositions";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <BarChartCompositions />
      <PillarBurstCompositions />
      <MarqueeCompositions />
      <TypewriterCompositions />
      <DiagonalWipeCompositions />
    </>
  );
};
