import PlaybackControls from "./sections/PlaybackControls";
import UiSettingsToolbar from "./sections/UiSettingsToolbar";
import AlignmentToolbar from "./sections/AlignmentToolbar";
import PagesModal from "@/components/page/PagesModal";
import MusicModal from "@/components/music/MusicModal";
import FieldModal from "@/components/field/FieldModal";
import MarchersModal from "@/components/marcher/MarchersModal";
import ToolbarSection from "@/components/toolbar/ToolbarSection";
import BugReport from "../ui/BugReport";
import TipsAndTricks from "../guides/TipsAndTricks";

export default function Topbar() {
    return (
        <div className="flex w-full flex-wrap gap-8">
            <PlaybackControls />
            <ToolbarSection>
                <MarchersModal />
                <PagesModal />
                <MusicModal />
                <FieldModal />
            </ToolbarSection>
            <UiSettingsToolbar />
            <AlignmentToolbar />
            <ToolbarSection aria-label="Feedback and tips">
                <TipsAndTricks />
                <BugReport />
            </ToolbarSection>
        </div>
    );
}
