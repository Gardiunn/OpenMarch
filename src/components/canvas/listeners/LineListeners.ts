import MarcherLine from "@/global/classes/canvasObjects/MarcherLine";
import CanvasListeners from "./CanvasListeners";
import DefaultListeners from "./DefaultListeners";
import { fabric } from "fabric";
import OpenMarchCanvas from "@/global/classes/canvasObjects/OpenMarchCanvas";
import { CanvasColors } from "../CanvasConstants";
import { Pathway } from "@/global/classes/canvasObjects/Pathway";

/**
 * LineListeners is an extension of DefaultListeners that handles the creation of lines on the canvas
 */
export default class LineListeners
    extends DefaultListeners
    implements CanvasListeners
{
    /** Boolean to keep track of if a line is being drawn */
    private _isDrawing = false;
    private _activeLine: MarcherLine | null = null;
    /** All of the pathways for the active line keyed by the marcherId */
    private pathways = new Map<number, fabric.Line>();

    constructor({ canvas }: { canvas: OpenMarchCanvas }) {
        super({ canvas });
        this.canvas.setCursor("crosshair");
        this.canvas.defaultCursor = "crosshair";

        window.addEventListener("keydown", this.handleKeyDown);
    }

    initiateListeners = () => {
        this.canvas.on("mouse:down", this.handleMouseDown);
        this.canvas.on("mouse:move", this.handleMouseMove);
        this.canvas.on("object:modified", this.handleObjectModified);
    };

    cleanupListeners = () => {
        this.clearLine();
        this.canvas.selection = true;
        this.canvas.resetCursorsToDefault();

        this.canvas.off("mouse:down", this.handleMouseDown as any);
        this.canvas.off("mouse:move", this.handleMouseMove as any);
        this.canvas.off("object:modified", this.handleObjectModified);
    };

    /** Discards the current active line */
    clearLine = () => {
        if (this._isDrawing && this._activeLine) {
            this.canvas.remove(this._activeLine);
            this._activeLine = null;
            this._isDrawing = false;
        }
    };

    handleMouseDown(fabricEvent: fabric.IEvent<MouseEvent>) {
        // Left click
        if (fabricEvent.e.button === 0) {
            // Performing normal mouse down if ctrl or meta key is pressed
            if (fabricEvent.e.ctrlKey || fabricEvent.e.metaKey) {
                super.handleMouseDown(fabricEvent);
                return;
            }
            if (!this._isDrawing && !this._activeLine) {
                const pointer = this.canvas.getPointer(fabricEvent.e);
                // Create the initial line
                this._activeLine = new MarcherLine({
                    x1: pointer.x,
                    y1: pointer.y,
                    x2: pointer.x,
                    y2: pointer.y,
                    startPageId: this.canvas.currentPage.id,
                    endPageId: this.canvas.currentPage.id,
                });

                this.canvas.add(this._activeLine);
                this._activeLine.editable = false;
                // Disable group selection while drawing
                this.canvas.selection = false;
                this._activeLine.setToNearestStep({
                    pointOne: { x: pointer.x, y: pointer.y },
                });
                this._isDrawing = true;
            } else {
                // Finalize the line
                this.drawNewMarcherPaths();
                if (this._activeLine) {
                    // MarcherLine.create([this._activeLine]);
                    // this._activeLine.editable = true;
                }
                // this._activeLine = null;
                this._isDrawing = false;
                this.canvas.selection = true;
            }
        }
        // Right click
        else if (fabricEvent.e.button === 2) {
            this.clearLine();
        }
    }

    /**
     * Clears the pathways from the marchers to the active line
     */
    clearPathways() {
        this.pathways.forEach((pathway) => {
            this.canvas.remove(pathway);
        });
        this.pathways.clear();
    }

    /**
     * Draws the new marcher paths for the active line
     */
    drawNewMarcherPaths() {
        if (!this._activeLine) return;
        if (this.canvas.eventMarchers.length < 2) {
            console.error(
                `Cannot create a marcherLine of < 2 marchers. Only found ${this.canvas.eventMarchers.length}`,
                this.canvas.eventMarchers
            );
            return;
        }
        this.clearPathways();
        const oldDots = this.canvas.eventMarchers.map((canvasMarcher) => {
            return {
                ...canvasMarcher.marcherPage,
                ...canvasMarcher.getMarcherCoords(),
            };
        });

        // If the line has more of a vertical slope, sort from top to bottom
        // If the line has a more horizontal slop, sort from left to right
        enum SortingDirectionEnum {
            leftToRight,
            topToBottom,
            rightToLeft,
            bottomToTop,
        }
        const coordinates = this._activeLine.getCoordinates();
        let sortingDirection: SortingDirectionEnum =
            SortingDirectionEnum.leftToRight;
        // check first that x1 and x2 aren't the same to avoid a divide by zero error
        if (coordinates.x1 === coordinates.x2) {
            if (coordinates.y1 < coordinates.y2)
                sortingDirection = SortingDirectionEnum.topToBottom;
            else sortingDirection = SortingDirectionEnum.bottomToTop;
        } else {
            const slope =
                (coordinates.y2 - coordinates.y1) /
                (coordinates.x2 - coordinates.x1);

            if (Math.abs(slope) > 1) {
                if (coordinates.y1 < coordinates.y2)
                    sortingDirection = SortingDirectionEnum.topToBottom;
                else sortingDirection = SortingDirectionEnum.bottomToTop;
            } else {
                if (coordinates.x1 < coordinates.x2)
                    sortingDirection = SortingDirectionEnum.leftToRight;
                else sortingDirection = SortingDirectionEnum.rightToLeft;
            }
        }

        switch (sortingDirection) {
            case SortingDirectionEnum.leftToRight:
                oldDots.sort((a, b) => a.x - b.x);
                break;
            case SortingDirectionEnum.topToBottom:
                oldDots.sort((a, b) => a.y - b.y);
                break;
            case SortingDirectionEnum.rightToLeft:
                oldDots.sort((a, b) => b.x - a.x);
                break;
            case SortingDirectionEnum.bottomToTop:
                oldDots.sort((a, b) => b.y - a.y);
                break;
        }
        const newDots = this._activeLine.distributeMarchers(oldDots);
        const createdPathways = this.canvas.renderPathways({
            startPageMarcherPages: oldDots,
            endPageMarcherPages: newDots,
            color: CanvasColors.tempPath,
            strokeWidth: 2,
            dashed: true,
        });
        this.pathways = new Map<number, Pathway>(
            createdPathways.map((pathway) => [pathway.marcherId, pathway])
        );

        this.canvas.renderStaticMarchers({
            color: CanvasColors.tempPath,
            intendedMarcherPages: newDots,
            allMarchers: this.canvas.eventMarchers.map(
                (canvasMarcher) => canvasMarcher.marcherObj
            ),
        });
        this.canvas.sendCanvasMarchersToFront();
    }

    handleMouseMove(fabricEvent: fabric.IEvent<MouseEvent>) {
        if (this.canvas.isDragging) super.handleMouseMove(fabricEvent);
        else if (this._isDrawing && this._activeLine) {
            const pointer = this.canvas.getPointer(fabricEvent.e);
            this._activeLine.setToNearestStep({
                pointTwo: {
                    x: pointer.x,
                    y: pointer.y,
                },
            });
            this.canvas.requestRenderAll();
        }
    }

    handleObjectModified(): void {
        this.drawNewMarcherPaths();
    }

    handleKeyDown = (keyboardEvent: KeyboardEvent) => {
        if (keyboardEvent.key === "Escape") this.clearLine();
    };
}
