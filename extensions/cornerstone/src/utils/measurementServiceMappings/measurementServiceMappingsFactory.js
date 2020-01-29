import cornerstone from 'cornerstone-core';

const SUPPORTED_TOOLS = ['Length', 'EllipticalRoi', 'RectangleRoi', 'ArrowAnnotate'];

const measurementServiceMappingsFactory = measurementService => {
  /**
   * Maps measurement service format object to cornerstone annotation object.
   *
   * @param {Measurement} measurement The measurement instance
   * @param {string} definition The source definition
   * @return {Object} Cornerstone annotation data
   */
  const toAnnotation = (measurement, definition) => {
    const {
      id,
      label,
      description,
      points,
      unit,
      sopInstanceUID,
      frameOfReferenceUID,
      referenceSeriesUID,
    } = measurement;

    return {
      toolName: definition,
      measurementData: {
        sopInstanceUid: sopInstanceUID,
        frameOfReferenceUid: frameOfReferenceUID,
        seriesInstanceUid: referenceSeriesUID,
        unit,
        text: label,
        description,
        handles: _getHandlesFromPoints(points),
        _measurementServiceId: id,
      },
    };
  };

  /**
   * Maps cornerstone annotation event data to measurement service format.
   *
   * @param {Object} cornerstone Cornerstone event data
   * @return {Measurement} Measurement instance
   */
  const toMeasurement = eventData => {
    const { toolType, toolName, element, measurementData } = eventData;
    const tool = toolType || toolName;

    const validToolType = toolName => SUPPORTED_TOOLS.includes(toolName);

    if (!validToolType(tool)) {
      throw new Error('Tool not supported');
    }

    const {
      sopInstanceUid,
      frameOfReferenceUid,
      seriesInstanceUid,
    } = _getAttributes(element);

    const points = [];
    points.push(measurementData.handles);

    return {
      id: measurementData._measurementServiceId,
      sopInstanceUID: sopInstanceUid,
      frameOfReferenceUID: frameOfReferenceUid,
      referenceSeriesUID: seriesInstanceUid,
      label: measurementData.text,
      description: measurementData.description,
      unit: measurementData.unit,
      area: measurementData.cachedStats && measurementData.cachedStats.area, /* TODO: Add concept names instead (descriptor) */
      type: _getValueTypeFromToolType(toolType),
      points: _getPointsFromHandles(measurementData.handles),
    };
  };

  const _getAttributes = element => {
    const enabledElement = cornerstone.getEnabledElement(element);
    const imageId = enabledElement.image.imageId;
    const sopInstance = cornerstone.metaData.get('instance', imageId);
    const sopInstanceUid = sopInstance.sopInstanceUid;
    const frameOfReferenceUid = sopInstance.frameOfReferenceUID;
    const series = cornerstone.metaData.get('series', imageId);
    const seriesInstanceUid = series.seriesInstanceUid;

    return { sopInstanceUid, frameOfReferenceUid, seriesInstanceUid };
  };

  const _getValueTypeFromToolType = toolType => {
    const { POLYLINE, ELLIPSE, POINT } = measurementService.VALUE_TYPES;

    /* TODO: Relocate static value types */
    const TOOL_TYPE_TO_VALUE_TYPE = {
      Length: POLYLINE,
      EllipticalRoi: ELLIPSE,
      RectangleRoi: POLYLINE,
      ArrowAnnotate: POINT,
    };

    return TOOL_TYPE_TO_VALUE_TYPE[toolType];
  };

  const _getPointsFromHandles = handles => {
    let points = [];
    Object.keys(handles).map(handle => {
      if (['start', 'end'].includes(handle)) {
        let point = {};
        if (handles[handle].x) point.x = handles[handle].x;
        if (handles[handle].y) point.y = handles[handle].y;
        points.push(point);
      }
    });
    return points;
  };

  const _getHandlesFromPoints = points => {
    return points
      .map((p, i) => (i % 10 === 0 ? { start: p } : { end: p }))
      .reduce((obj, item) => Object.assign(obj, { ...item }), {});
  };

  return {
    toAnnotation,
    toMeasurement,
  };
};

export default measurementServiceMappingsFactory;