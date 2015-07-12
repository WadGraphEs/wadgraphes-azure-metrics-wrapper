﻿"use strict";
(function () {
	var Chart = function(uri) {
		this.uri = uri;
		this.$AssertChartElementAvailable();
		this.setNotRendered();
	}

	Chart.prototype = {
		Render: function (uri) {
			uri = encodeURIComponent(uri || this.uri);

			this.setLoading();

			var me = this;
			return $.ajax({
				url: '/api/charts/get-chart-data?uri=' + uri
			})
			.done(function (data) {
				me.Draw(data);
			})
			.fail(function(result) {
				me.DisplayError(JSON.parse(result.responseText));
			});
			
		},
		$AssertChartElementAvailable: function() {
			if(!this.$chart) {
				this.initChartElement();
			}
			return this.$chart;		
		},
		initChartElement: function() {
			var $chart = $getChartElement();

			$chart.hover(function () {
				$chart.addClass('hover');
			}, function () {
				$chart.removeClass('hover');
			});

			$('#chart-container').append($chart);

			this.$chart = $chart;
			
		},
		Draw: function(data) {
			var $chart = this.$chart;

			this.setLoaded();

			var series = $.map(data.Series, function (serie) {
				return {
					name: serie.Name,
					data: $.map(serie.DataPoints, function (point) {
						return [[
							Common.DateTime.FromISOUTCString(point.Timestamp).AsJSDate().getTime(),
							point.Value
						]];
					})
				}
			});

			$chart.find('.chart-area').highcharts({
				plotOptions: {
					series: {
						animation: false
					}
				},
				title: {
					text: data.Name
				},
				xAxis: {
					type: 'datetime'
				},
				yAxis: {
					min: 0,
				},
				series: series
			})
		},
		DisplayError: function(msg) {
			new ErrorBox(this.$chart, msg.Message, msg.ExceptionMessage);
		},
		onRemoveClick: function (cb) {
			this.$chart.find('.dropdown .remove-chart').on('click', cb);
		},
		remove: function () {
			this.$chart.remove();
		},
		showLast: function(interval, unit) {
			this.Render(this.uri+"?interval="+interval+"&unit="+unit);
		},
		setNotRendered: function() {
		},
		setLoading: function() {
			this.assertLoaderElement();
			this.$chart.removeClass('loaded');
			this.$chart.find('.load-error-box').remove();
		},
		setLoaded: function() {
			this.$chart.addClass('loaded');
		},
		assertLoaderElement: function () {
			if(this.$loader) {
				return;
			}
			var $el = $('<div class="chart-loader"></div>');
			$el.css({
				width: this.$chart.width(),
				height: this.$chart.height(),
			});
			this.$chart.append($el);
			this.$loader = $el;
		}
	}

	Chart.FromURI = function(uri) {
		return new Chart(uri);
	}

	var DashboardChart = function (chartInfo) {
		this.chartInfo = chartInfo;
		this.chart = Chart.FromURI(this.chartInfo.Uri);
		this.setupEvents();

		var me = this;
		Events.Register("Dashboard.IntervalChanged", function(interval, unit) {
			me.chart.showLast(interval, unit);
		});
	}

	DashboardChart.prototype = {
		Render: function () {
			return this.chart.Render();
		},
		setupEvents: function () {
			var me = this;
			this.chart.onRemoveClick(function (ev) {
				ev.preventDefault();
				me.chart.remove();
				me.remove();
			});
		},
		remove: function () {
			$.ajax({
				'url': '/dashboard/remove-chart',
				'data': { chartId: this.chartInfo.Id },
				'method': 'post'
			});
		},
	}

	
	DashboardChart.FromData = function (data) {
		return new DashboardChart(data);
	}

	$.extend(true,window,{ Charts: { DashboardChart: DashboardChart  }});

	$(function() {
		$('.load-chart').each(function(idx, item) {
			$(this).remove();
			return DashboardChart.FromData(JSON.parse(item.value)).Render();
		});
	});

	var $getChartElement = function () {
		var $result = $('#chart-template').clone();
		
		return $result.attr('id', '');
	}
})();