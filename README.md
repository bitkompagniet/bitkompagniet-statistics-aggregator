[![Build Status](https://travis-ci.org/bitkompagniet/bitkompagniet-statistics-aggregator.svg?branch=master)](https://travis-ci.org/bitkompagniet/bitkompagniet-statistics-aggregator)

A slim wrapper of logic and sanity around a standard **group-reduce** operation
that provides an interface specific to statistical data presentation.

It revolves around the concept of sets, dimensions and metrics, which are common to data presentation API's such as Google Adx.

In most cases, you don't need this package. Instead, you should use the relevant database aggregate functions (SQL GROUP BY / SUM or mongodb's .mapReduce(), for example).

## Install

```
npm install --save bitkompagniet-statistics-aggregator
```

## Basic use
It contains just a single function:

```javascript
var dataset = [
	{ website: 'some.com', date: '2016-06-06', revenue: 56.5 },
	{ website: 'some.com', date: '2016-06-07', revenue: 80 },
	{ website: 'other.com', date: '2016-06-05', revenue: 20.5 },
	{ website: 'other.com', date: '2016-06-05', revenue: 10 },
	{ website: 'other.com', date: '2016-06-06', revenue: 100 },
];

var aggregator = require('bitkompagniet-statistics-aggregator');

var perWebsite = aggregator(dataset, ['website'], { revenue: 'sum' });
// [ 
//   { website: 'some.com', revenue: 136.6 }, 
//   { website: 'other.com', revenue: 130.5 } 
// ];

var perDate = aggregator(dataset, ['date'], { revenue: 'sum' });
// [ 
//   { date: '2016-06-06', revenue: 156.5 }, 
//   { date: '2016-06-05', revenue: 30.5 }, 
//   { date: '2016-06-07', revenue: 80 } 
// ];

```

## API

```
aggregator(dataset, dimensions, metrics)
```

#### dataset `array`

```javascript
[ { website: 'some.com', revenue: 80 }, { website: 'other.com', revenue: 70 } ]
```

Dataset is assumed to be an array of (relatively) uniform plain objects. Some of the keys in these objects are data we want to query, filter, sort and group by. We call these the **dimensional fields**. Others are those we want to reduce or map. We call these the **metrics**. 

#### dimensions `array`

```javascript
[ 'website', 'date' ]
```

The dataset is first grouped by _a combination_ of all dimensions. The dimensions are given as an array of strings, each corresponding to an object key. All reductions are performed in these groups, so the resulting set will be of the same length as the number of combinations in the dataset.

#### metrics `object`

```javascript
{ revenue: 'sum', visitors: (total, value) => total + value }
```

An object where keys represent dataset keys, and values are strings denoting the standard function for aggregation, or, alternatively, a custom function. The only built-in functions at this time is:

- `sum`
- `average` (untested)

If supplied as a custom function, it has the following signature:

```
function(total, value, index, item) { ... }
```

- **total**: the accumulated value carried through the reduction.
- **value**: the current value.
- **index**: the index of the current value.
- **item**: the current, entire dataset item.

#### Returns `array`

The result will be an array of the aggregation results, similar to the dataset, but will only contain the keys given in dimensions and metrics, respectively. Any extra keys will be removed in the reduction.
