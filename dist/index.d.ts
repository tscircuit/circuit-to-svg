import { AnyCircuitElement, PcbPort, SimulationExperiment, SimulationTransientVoltageGraph, SimulationVoltageProbe, SchematicComponent } from 'circuit-json';
import { Matrix } from 'transformation-matrix';
import { INode } from 'svgson';

interface PcbGridOptions {
    cellSize: number;
    lineColor?: string;
    majorCellSize?: number;
    majorLineColor?: string;
}

type CopperLayerName = "top" | "bottom" | "inner1" | "inner2" | "inner3" | "inner4" | "inner5" | "inner6";
type CopperColorMap = Record<CopperLayerName, string> & {
    [layer: string]: string;
};
interface PcbColorMap {
    copper: CopperColorMap;
    drill: string;
    silkscreen: {
        top: string;
        bottom: string;
    };
    boardOutline: string;
    soldermask: {
        top: string;
        bottom: string;
    };
    soldermaskWithCopperUnderneath: {
        top: string;
        bottom: string;
    };
    soldermaskOverCopper: {
        top: string;
        bottom: string;
    };
    substrate: string;
    courtyard: {
        top: string;
        bottom: string;
    };
    keepout?: string;
    debugComponent: {
        fill: string | null;
        stroke: string | null;
    };
}
interface PcbColorOverrides {
    copper?: Partial<PcbColorMap["copper"]>;
    drill?: string;
    silkscreen?: Partial<PcbColorMap["silkscreen"]>;
    boardOutline?: string;
    soldermask?: Partial<PcbColorMap["soldermask"]>;
    soldermaskWithCopperUnderneath?: Partial<PcbColorMap["soldermaskWithCopperUnderneath"]>;
    soldermaskOverCopper?: Partial<PcbColorMap["soldermaskOverCopper"]>;
    substrate?: string;
    courtyard?: Partial<PcbColorMap["courtyard"]>;
    keepout?: string;
    debugComponent?: Partial<PcbColorMap["debugComponent"]>;
}

interface PcbSvgOptions {
    colorOverrides?: PcbColorOverrides;
    width?: number;
    height?: number;
    shouldDrawErrors?: boolean;
    showErrorsInTextOverlay?: boolean;
    shouldDrawRatsNest?: boolean;
    showCourtyards?: boolean;
    showPcbGroups?: boolean;
    layer?: "top" | "bottom";
    matchBoardAspectRatio?: boolean;
    backgroundColor?: string;
    drawPaddingOutsideBoard?: boolean;
    includeVersion?: boolean;
    showSolderMask?: boolean;
    showPcbNotes?: boolean;
    grid?: PcbGridOptions;
    showAnchorOffsets?: boolean;
    viewport?: {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
    };
    viewportTarget?: {
        pcb_panel_id?: string;
        pcb_board_id?: string;
    };
}
interface PcbContext {
    transform: Matrix;
    layer?: "top" | "bottom";
    shouldDrawErrors?: boolean;
    showCourtyards?: boolean;
    showPcbGroups?: boolean;
    drawPaddingOutsideBoard?: boolean;
    colorMap: PcbColorMap;
    showSolderMask?: boolean;
    showPcbNotes?: boolean;
    showAnchorOffsets?: boolean;
    circuitJson?: AnyCircuitElement[];
}
declare function convertCircuitJsonToPcbSvg(circuitJson: AnyCircuitElement[], options?: PcbSvgOptions): string;
/**
 * @deprecated use `convertCircuitJsonToPcbSvg` instead
 */
declare const circuitJsonToPcbSvg: typeof convertCircuitJsonToPcbSvg;

interface Options$3 {
    width?: number;
    height?: number;
    includeVersion?: boolean;
    showErrorsInTextOverlay?: boolean;
}
interface AssemblySvgContext {
    transform: Matrix;
}
declare function convertCircuitJsonToAssemblySvg(soup: AnyCircuitElement[], options?: Options$3): string;

type LabelPosition = {
    text: string;
    aliases: string[];
    elbow_end: {
        x: number;
        y: number;
    };
    label_pos: {
        x: number;
        y: number;
    };
    edge: "left" | "right" | "top" | "bottom";
};

interface Options$2 {
    width?: number;
    height?: number;
    includeVersion?: boolean;
    showErrorsInTextOverlay?: boolean;
}
interface PinoutLabel {
    pcb_port: PcbPort;
    aliases: string[];
    edge: "left" | "right" | "top" | "bottom";
}
interface PinoutSvgContext {
    transform: Matrix;
    soup: AnyCircuitElement[];
    board_bounds: {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
    };
    styleScale: number;
    label_positions: Map<string, LabelPosition>;
    svgWidth: number;
    svgHeight: number;
}
declare function convertCircuitJsonToPinoutSvg(soup: AnyCircuitElement[], options?: Options$2): string;

declare const colorMap: {
    "3d_viewer": {
        background_bottom: string;
        background_top: string;
        board: string;
        copper: string;
        silkscreen_bottom: string;
        silkscreen_top: string;
        soldermask: string;
        solderpaste: string;
    };
    board: {
        anchor: string;
        aux_items: string;
        b_adhes: string;
        b_crtyd: string;
        b_fab: string;
        b_mask: string;
        b_paste: string;
        b_silks: string;
        background: string;
        cmts_user: string;
        copper: {
            b: string;
            f: string;
            in1: string;
            in10: string;
            in11: string;
            in12: string;
            in13: string;
            in14: string;
            in15: string;
            in16: string;
            in17: string;
            in18: string;
            in19: string;
            in2: string;
            in20: string;
            in21: string;
            in22: string;
            in23: string;
            in24: string;
            in25: string;
            in26: string;
            in27: string;
            in28: string;
            in29: string;
            in3: string;
            in30: string;
            in4: string;
            in5: string;
            in6: string;
            in7: string;
            in8: string;
            in9: string;
        };
        cursor: string;
        drc: string;
        drc_error: string;
        drc_exclusion: string;
        drc_warning: string;
        dwgs_user: string;
        eco1_user: string;
        eco2_user: string;
        edge_cuts: string;
        f_adhes: string;
        f_crtyd: string;
        f_fab: string;
        f_mask: string;
        f_paste: string;
        f_silks: string;
        footprint_text_back: string;
        footprint_text_front: string;
        footprint_text_invisible: string;
        grid: string;
        grid_axes: string;
        margin: string;
        microvia: string;
        no_connect: string;
        pad_back: string;
        pad_front: string;
        pad_plated_hole: string;
        pad_through_hole: string;
        plated_hole: string;
        ratsnest: string;
        select_overlay: string;
        through_via: string;
        user_1: string;
        user_2: string;
        user_3: string;
        user_4: string;
        user_5: string;
        user_6: string;
        user_7: string;
        user_8: string;
        user_9: string;
        via_blind_buried: string;
        via_hole: string;
        via_micro: string;
        via_through: string;
        worksheet: string;
    };
    gerbview: {
        axes: string;
        background: string;
        dcodes: string;
        grid: string;
        layers: string[];
        negative_objects: string;
        worksheet: string;
    };
    meta: {
        filename: string;
        name: string;
        version: number;
    };
    simulation_palette: string[];
    palette: string[];
    schematic: {
        aux_items: string;
        background: string;
        brightened: string;
        bus: string;
        bus_junction: string;
        component_body: string;
        component_outline: string;
        cursor: string;
        erc_error: string;
        erc_warning: string;
        fields: string;
        grid: string;
        grid_axes: string;
        hidden: string;
        junction: string;
        label_global: string;
        label_background: string;
        label_hier: string;
        label_local: string;
        net_name: string;
        no_connect: string;
        note: string;
        override_item_colors: boolean;
        pin: string;
        pin_name: string;
        pin_number: string;
        reference: string;
        shadow: string;
        sheet: string;
        sheet_background: string;
        sheet_fields: string;
        sheet_filename: string;
        sheet_label: string;
        sheet_name: string;
        table: string;
        value: string;
        wire: string;
        wire_crossing: string;
        worksheet: string;
    };
};
type ColorMap = typeof colorMap;

type ColorOverrides = {
    schematic?: Partial<ColorMap["schematic"]>;
};
interface Options$1 {
    colorOverrides?: ColorOverrides;
    width?: number;
    height?: number;
    grid?: boolean | {
        cellSize?: number;
        labelCells?: boolean;
    };
    labeledPoints?: Array<{
        x: number;
        y: number;
        label: string;
    }>;
    includeVersion?: boolean;
    showErrorsInTextOverlay?: boolean;
    drawPorts?: boolean;
}
declare function convertCircuitJsonToSchematicSvg(circuitJson: AnyCircuitElement[], options?: Options$1): string;
/**
 * @deprecated use `convertCircuitJsonToSchematicSvg` instead
 */
declare const circuitJsonToSchematicSvg: typeof convertCircuitJsonToSchematicSvg;

type CircuitJsonWithSimulation = AnyCircuitElement | SimulationExperiment | SimulationTransientVoltageGraph | SimulationVoltageProbe;
declare function isSimulationTransientVoltageGraph(value: CircuitJsonWithSimulation): value is SimulationTransientVoltageGraph;
declare function isSimulationExperiment(value: CircuitJsonWithSimulation): value is SimulationExperiment;
declare function isSimulationVoltageProbe(value: CircuitJsonWithSimulation): value is SimulationVoltageProbe;

interface ConvertSchematicSimulationParams {
    circuitJson: CircuitJsonWithSimulation[];
    simulation_experiment_id: string;
    simulation_transient_voltage_graph_ids?: string[];
    width?: number;
    height?: number;
    schematicHeightRatio?: number;
    schematicOptions?: Omit<Parameters<typeof convertCircuitJsonToSchematicSvg>[1], "width" | "height" | "includeVersion">;
    includeVersion?: boolean;
    /** When true, place the simulation graph above the schematic instead of below (defaults to false). */
    graphAboveSchematic?: boolean;
    showErrorsInTextOverlay?: boolean;
}
declare function convertCircuitJsonToSchematicSimulationSvg({ circuitJson, simulation_experiment_id, simulation_transient_voltage_graph_ids, width, height, schematicHeightRatio, schematicOptions, includeVersion, graphAboveSchematic, showErrorsInTextOverlay, }: ConvertSchematicSimulationParams): string;

interface Options {
    layer: "top" | "bottom";
    width?: number;
    height?: number;
    includeVersion?: boolean;
    showErrorsInTextOverlay?: boolean;
}
declare function convertCircuitJsonToSolderPasteMask(circuitJson: AnyCircuitElement[], options: Options): string;

interface ConvertSimulationGraphParams {
    circuitJson: CircuitJsonWithSimulation[];
    simulation_experiment_id: string;
    simulation_transient_voltage_graph_ids?: string[];
    width?: number;
    height?: number;
    includeVersion?: boolean;
}
declare function convertCircuitJsonToSimulationGraphSvg({ circuitJson, simulation_experiment_id, simulation_transient_voltage_graph_ids, width, height, includeVersion, }: ConvertSimulationGraphParams): string;

declare function getSoftwareUsedString(circuitJson: AnyCircuitElement[]): string | undefined;

declare const CIRCUIT_TO_SVG_VERSION: string;

declare const createSvgObjectsForSchComponentPortHovers: ({ component, transform, circuitJson, }: {
    component: SchematicComponent;
    transform: Matrix;
    circuitJson: AnyCircuitElement[];
}) => INode[];

declare function createErrorTextOverlay(circuitJson: AnyCircuitElement[], dataType?: string): INode | null;

export { type AssemblySvgContext, CIRCUIT_TO_SVG_VERSION, type CircuitJsonWithSimulation, type ColorMap, type ColorOverrides, type PcbColorMap, type PcbColorOverrides, type PcbContext, type PcbSvgOptions, type PinoutLabel, type PinoutSvgContext, circuitJsonToPcbSvg, circuitJsonToSchematicSvg, convertCircuitJsonToAssemblySvg, convertCircuitJsonToPcbSvg, convertCircuitJsonToPinoutSvg, convertCircuitJsonToSchematicSimulationSvg, convertCircuitJsonToSchematicSvg, convertCircuitJsonToSimulationGraphSvg, convertCircuitJsonToSolderPasteMask, createErrorTextOverlay, createSvgObjectsForSchComponentPortHovers, getSoftwareUsedString, isSimulationExperiment, isSimulationTransientVoltageGraph, isSimulationVoltageProbe };
