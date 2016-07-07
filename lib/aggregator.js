const _ = require('lodash');
// const debug = require('debug')('debug:aggregator');

function isNumeric(value) {
	return !isNaN(parseFloat(value)) && isFinite(value);
}

function n(value) {
	return isNumeric(value) ? parseFloat(value) : 0;
}

const reducers = {
	sum: (total, value) => n(total) + n(value),
	average: (total, value, index) => ((n(total) * index) + n(value)) / (index + 1),
};

function dimensionsIdentifier(row, fields) {
	return _.map(fields, fieldName => row[fieldName] || 'empty').join('-');
}

function zeroMetricObject(metrics) {
	const result = {};

	_.each(metrics, (metric, name) => {
		result[name] = 0;
	});

	return result;
}

function aggregateOnDimensions(set, dimensions, metrics) {
	const identifierFunction =
		(!dimensions || dimensions.length === 0)
		? () => 'all'
		: row => dimensionsIdentifier(row, dimensions);

	const groups = _.groupBy(set, identifierFunction);
	const definedFields = dimensions.concat(_.keys(metrics));

	return _.map(groups, subset =>
		_.reduce(subset, (agr, item, index) => {
			const result = _.merge({}, agr, item);

			_.each(metrics, (func, name) => {
				const f = (_.isFunction(func) && func) || (func in reducers && reducers[func]) || null;

				if (!f) {
					throw new Error(`Metric definition could not be resolved to a reducer function: ${func}`);
				}

				result[name] = f(agr[name], item[name], index, item);
			});

			const notDefinedFields = _.difference(_.keys(item), definedFields);

			_.each(notDefinedFields, omitDimension => {
				if (omitDimension in result) delete result[omitDimension];
			});

			return result;
		}, zeroMetricObject(metrics))

	);
}

function isMetrics(metrics) {
	return _.isPlainObject(metrics) &&
		_.every(metrics, func => _.isFunction(func) || func in reducers);
}

function isDimensions(dimensions) {
	return Array.isArray(dimensions) &&
		_.every(dimensions, _.isString);
}

function isSet(set) {
	return Array.isArray(set) &&
		_.every(set, _.isPlainObject);
}

function aggregate(set, dimensions, metrics) {
	const data = set.slice();

	if (!isSet(set)) throw new Error('Dataset must be an array of plain objects.');
	if (!isDimensions(dimensions)) throw new Error('Dimensions must be an array of strings.');
	if (!isMetrics(metrics)) {
		throw new Error(`Metrics must be an array of objects, with every element resolving to a function or the reducer key (${_.keys(reducers).join(', ')})`); // eslint-disable-line max-len
	}

	return aggregateOnDimensions(data, dimensions, metrics);
}

module.exports = aggregate;
