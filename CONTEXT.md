# Diagram Conversion

This context defines the language used when turning an authored Excalidraw diagram into a Mermaid representation.

## Language

**Conversion Workspace**:
The working view in which the Source Diagram and the current Generated Diagram are presented together.
_Avoid_: Editor, dashboard

**Source Diagram**:
The Excalidraw diagram that is treated as the authoritative input to a conversion.
_Avoid_: Drawing, input file

**Node Shape**:
A rectangle, ellipse, or diamond in the Source Diagram that represents a logical graph node.
_Avoid_: Box, object

**Connection**:
A directed arrow between Node Shapes that represents a logical graph edge.
_Avoid_: Line, connector

**Unsupported Source Element**:
An element retained in the Source Diagram but deliberately excluded from Conversion because it has no supported graph representation.
_Avoid_: Invalid element, discarded element

**Label**:
Text associated with a Node Shape or Connection and carried into the Generated Diagram.
_Avoid_: Caption, annotation

**Conversion**:
An explicit transformation of the current Source Diagram into a Generated Diagram and associated Conversion Warnings.
_Avoid_: Export, sync

**Generated Diagram**:
The Mermaid representation produced by a Conversion.
_Avoid_: Output, converted file

**Outdated Generated Diagram**:
A Generated Diagram whose Source Diagram has changed since its Conversion. It remains viewable but no longer represents the current source.
_Avoid_: Broken preview, invalid output, stale state

**Rendered Preview**:
The visual rendering of the current Generated Diagram.
_Avoid_: Source preview, converted drawing

**Conversion Warning**:
A structured explanation of source content or relationships that could not be represented confidently in the Generated Diagram.
_Avoid_: Error, log message
