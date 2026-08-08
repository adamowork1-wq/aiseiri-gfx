import "./index.css";
import { MyComposition } from "./Composition";
import { BarChartCompositions } from "./BarChartCompositions";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <BarChartCompositions />
    </>
  );
};
