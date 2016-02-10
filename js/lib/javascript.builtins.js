'use strict';

// ---------- Implement missing ECMA Script methods ----------

// Add ECMA262-5 method binding if not supported natively
//
if (!('bind' in Function.prototype))
{
	Function.prototype.bind = function(owner)
	{
		var that = this;
		if (arguments.length <= 1)
		{
			return function()
			{
				return that.apply(owner, arguments);
			};
		}
		else
		{
			var args = Array.prototype.slice.call(arguments, 1);
			return function()
			{
				return that.apply(owner, arguments.length === 0 ? args : args.concat(Array.prototype.slice.call(arguments)));
			};
		}
	};
}

// Add ECMA262-5 string trim if not supported natively
//
if (!('trim' in String.prototype))
{
	String.prototype.trim = function()
	{
		return this.replace(/^\s+/, '').replace(/\s+$/, '');
	};
}

// Add ECMA262-5 Array methods if not supported natively
//
if (!('indexOf' in Array.prototype))
{
	Array.prototype.indexOf = function(find, i /* opt */)
	{
		if (i === undefined) i = 0;
		if (i < 0) i += this.length;
		if (i < 0) i = 0;
		for (var n = this.length; i < n; i++)
			if (i in this && this[i] === find) return i;
		return -1;
	};
}
if (!('lastIndexOf' in Array.prototype))
{
	Array.prototype.lastIndexOf = function(find, i /* opt */)
	{
		if (i === undefined) i = this.length - 1;
		if (i < 0) i += this.length;
		if (i > this.length - 1) i = this.length - 1;
		for (i++; i-- > 0;)
			/* i++ because from-argument is sadly inclusive */
			if (i in this && this[i] === find) return i;
		return -1;
	};
}
if (!('forEach' in Array.prototype))
{
	Array.prototype.forEach = function(action, that /* opt */)
	{
		for (var i = 0, n = this.length; i < n; i++)
			if (i in this) action.call(that, this[i], i, this);
	};
}
if (!('map' in Array.prototype))
{
	Array.prototype.map = function(mapper, that /* opt */)
	{
		var other = new Array(this.length);
		for (var i = 0, n = this.length; i < n; i++)
			if (i in this) other[i] = mapper.call(that, this[i], i, this);
		return other;
	};
}
if (!('filter' in Array.prototype))
{
	Array.prototype.filter = function(filter, that /* opt */)
	{
		var other = [], v;
		for (var i = 0, n = this.length; i < n; i++)
			if (i in this && filter.call(that, v = this[i], i, this)) other.push(v);
		return other;
	};
}
if (!('every' in Array.prototype))
{
	Array.prototype.every = function(tester, that /* opt */)
	{
		for (var i = 0, n = this.length; i < n; i++)
			if (i in this && !tester.call(that, this[i], i, this)) return false;
		return true;
	};
}
if (!('some' in Array.prototype))
{
	Array.prototype.some = function(tester, that /* opt */)
	{
		for (var i = 0, n = this.length; i < n; i++)
			if (i in this && tester.call(that, this[i], i, this)) return true;
		return false;
	};
}

// ---------- Additional non-standard extension ----------

// String Extensions

String.prototype.endsWith = function(str)
{
	return (str != null) && (this.indexOf(str) == (this.length - str.legnth));
};
String.prototype.startsWith = function(str)
{
	return (str != null) && (this.indexOf(str) == 0);
};
String.prototype.replaceAll = function(search, replace)
{
	// if replace is null, return original string otherwise it will
	// replace search string with 'undefined'.
	if (!replace) return this;
	return this.replace(new RegExp('[' + search + ']', 'g'), replace);
};
String.prototype.contains = function(search)
{
	return this.indexOf(search) != -1;
};

String.prototype.compare = function(otherString)
{
	if (this < otherString)
	{
		return -1;
	}
	else if (this > otherString)
	{
		return 1;
	}
	else
	{
		return 0;
	}
};

// Array Extensions

if (!('contains' in Array.prototype))
{
	Array.prototype.contains = function(obj)
	{
		return (this.indexOf(obj) != -1);
	};
}

// Array.prototype.find - MIT License (c) 2013 Paul Miller
// <http://paulmillr.com>
// For all details and docs: https://github.com/paulmillr/array.prototype.find
// Fixes and tests supplied by Duncan Hall <http://duncanhall.net>

if (!('find' in Array.prototype))
{
	Array.prototype.find = function(predicate)
	{
		var list = Object(this);
		var length = list.length < 0 ? 0 : list.length >>> 0; // ES.ToUint32;
		if (length === 0) return undefined;
		if (typeof predicate !== 'function' || Object.prototype.toString.call(predicate) !== '[object Function]')
		{
			throw new TypeError('Array#find: predicate must be a function');
		}

		var thisArg = arguments[1];
		for (var i = 0, value; i < length; i++)
		{
			value = list[i];
			if (predicate.call(thisArg, value, i, list)) return value;
		}
		return undefined;
	};
}
