import MapLoader from "./ui/map-loader";
import { OffFooter, OffHeader } from "./ui/off-chrome";

export default function Home() {
  return (
    <div className="app-shell">
      <OffHeader />
      <MapLoader />
      <OffFooter />
    </div>
  );
}
