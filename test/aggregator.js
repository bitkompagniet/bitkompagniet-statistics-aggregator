/* eslint-disable no-magic-numbers */
/* global define describe, it, before */

const chai = require('chai');
const should = chai.should();
const aggregator = require('../lib/aggregator');
const _ = require('lodash');
const Converter = require('csvtojson').Converter;

describe('Aggregator', () => {
	let data = null;
	const expectedDataRows = 400;

	before(done => {
		const converter = new Converter({});

		converter.fromFile('./test/data/statatoms.csv', (err, json) => {
			data = json;
			done(err);
		});
	});

	it('Should be a function with 3 mandatory args', () => {
		aggregator.should.be.a('function');
		aggregator.length.should.equal(3);
	});

	it('Should have well-formed data', () => {
		should.exist(data);

		data.should.be.an('array');
		data.length.should.equal(expectedDataRows);
		data.forEach(row => {
			row.should.be.an('object');
			row.should.contain.all.keys(
				'_id',
				'date',
				'identifier',
				'source',
				'placement',
				'publisher',
				'revenue'
			);
		});
	});

	it('Should throw when we specify invalid arguments', () => {
		should.throw(() => aggregator(data, ['unknown']));
		should.not.throw(() => aggregator(data, ['website', 'source'], {}));
		should.not.throw(() => aggregator(data, ['website', 'source'], {
			revenue: 'sum',
			ecpm: (total, item) => total + item,
		}));
		should.throw(() => aggregator(data, ['website', 'source'], { revenue: 'wuut' }));
	});

	const testScenarios = [
		{ dimensions: ['website'] },
		{ dimensions: ['website', 'source'] },
		{ dimensions: ['date'] },
		{ dimensions: ['date', 'website'] },
	];

	const uniqValuesForParam = param =>
		_.uniq(_.map(data, param)).length;

	const combinations = params =>
		_.reduce(_.map(params, uniqValuesForParam), (sum, value) => sum + value);

	testScenarios.forEach(params => {
		it(`Should be able to aggregate correctly with params ${params.dimensions.join(', ')}`, () => {
			aggregator.should.be.a('function');
			const result = aggregator(data, ['website'], { revenue: 'sum' });

			should.exist(result);
			result.should.be.an('array');
			result.length.should.be.below(expectedDataRows);
			result.length.should.be.at.most(combinations(params.dimensions));
		});
	});

	const approximate = (actual, target, tolerance) =>
		actual.should.be.within(target - tolerance, target + tolerance);

	it('Should sum all Admeta values correctly (summed in Excel)', () => {
		const sumImpressionsIn = 410092;
		const sumEcpm = 2071.251274;
		const sumRevenue = 3653.032566;
		const sumImpressionsOut = 7654;
		const tolerance = 0.000001;

		const result = aggregator(data, ['source'], {
			revenue: 'sum',
			impressionsIn: 'sum',
			impressionsOut: 'sum',
			ecpm: 'sum',
		});

		should.exist(result);

		result.should.be.an('array');
		result.length.should.equal(2);

		const admeta = _.find(result, { source: 'admeta' });

		should.exist(admeta);
		admeta.should.be.an('object');
		admeta.should.contain.all.keys('source', 'impressionsIn', 'ecpm', 'revenue', 'impressionsOut');
		admeta.should.not.contain.all.keys(
			'_id',
			'identifier',
			'date',
			'website',
			'placement',
			'placementName',
			'publisher',
			'webpage',
			'device'
		);
		admeta.source.should.equal('admeta');

		approximate(admeta.impressionsIn, sumImpressionsIn, tolerance);
		approximate(admeta.ecpm, sumEcpm, tolerance);
		approximate(admeta.revenue, sumRevenue, tolerance);
		approximate(admeta.impressionsOut, sumImpressionsOut, tolerance);
	});

	it('Should return only one row if no dimensions have been selected', () => {
		const result = aggregator(data, [], { revenue: 'sum' });

		should.exist(result);

		result.should.be.an('array');
		result.length.should.equal(1);
	});

	it('Should sum correctly with ssp cuts delivered', () => {
		const sumRevenue = 3653.032566;
		const admetaCut = 0.15;
		const targetValue = sumRevenue - (sumRevenue * admetaCut);
		const tolerance = 0.000001;

		targetValue.should.be.a('number');

		const result = aggregator(data, ['source'], {
			revenue: (total, value) => total + (value * (1 - admetaCut)),
		});

		should.exist(result);

		const admeta = _.find(result, { source: 'admeta' });

		should.exist(admeta);
		admeta.should.be.an('object');

		approximate(admeta.revenue, targetValue, tolerance);
	});
});
