window.tc_seat_zoom_level_prev = 1;
window.tc_seat_zoom_level = 1;

jQuery(document).ready(function($) {
    setInterval(function() {
        var count = $(".ui-selectee").length,
            current = $('#pa_total_seat, #pa_total_seats').attr('data-total-seat'),
            seatObjectCount = 0;
        if ($('.tc-object-selectable').attr('data-tt-id')) {
            seatObjectCount = $('.tc-object-selectable').attr('data-tt-id');
            seatObjectCount = parseInt(seatObjectCount) - 1;
        }
        count = parseInt(count) + parseInt(seatObjectCount);
        if (count > current) {
            $('#pa_total_seat, #pa_total_seats').attr('data-total-seat', count);
            $('#pa_total_seat, #pa_total_seats').html(count);
        } else if ((current < count) || (count < current)) {
            $('#pa_total_seat, #pa_total_seats').attr('data-total-seat', count);
            $('#pa_total_seat, #pa_total_seats').html(count);
        }
    }, 500);
    setTimeout(function() {
        tc_hide_updated_notice();

        function tc_hide_updated_notice() {
            $('.notice.tc-tickera-show:not(.tc-donothide)').fadeTo(250, 0);
        }


        $('body').on('click', '.tc-save-button', function(e) {
            e.preventDefault();
            $('#tc_current_screen_width').val($(window).width());
        });

        $('body').on('click', '.tc-sidebar .md-accordion .md-toolbar-tools', function(e) {
            tc_controls.set_default_settings_values();
            tc_controls.unselect_all();
            tc_controls.hide_ticket_type_box();
            tc_controls.hide_labels();
        });

        /**
         * Prevent form submission on enter key press while input field is in the focus
         */
        $(document).keypress(function(e) {
            if (e.which == 13) {
                e.preventDefault();
            }
        });

        var tc_seats_key_press_listener = new window.keypress.Listener();

        tc_seats_key_press_listener.register_many([{
            "keys": "meta s",
            "is_exclusive": true,
            "on_keydown": function() {
                tc_controls.save();
            },
        }]);

        $('.tc-wrapper').bind("focus", function() {
            tc_seats_key_press_listener.stop_listening();
        }).bind("blur", function() {
            tc_seats_key_press_listener.listen();
        });

        $(window).resize(function() {
            tc_controls.set_wrapper_height();
        });

        $('body').on('click', 'div.tc-tier', function(event) {
            tc_controls.set_default_settings_values(event);
            if ($('.tc-object-selectable').hasClass('ui-selected')) {
                $(".tc-object-selectable").removeClass('ui-selected');
            }
            //if ($(event.target).attr('class') == 'tc-wrapper') {
            //tc_controls.remove_edit_mode();
            //}
        });

        $('body').on('click', 'div.tc-wrapper', function(event) {
            if ($(event.target).attr('class') == 'tc-wrapper') {
                tc_controls.unselect_all();
                tc_controls.hide_labels();
            }
        });

        $('body').on('click', '.pa-tabs #tab-item-0', function() {
            $('.ui-selectable').selectable({
                filter: '.tc_seat_unit',
                cancel: '.tc_seat_reserved',
                disabled: true
            });
            $('.tc-group-tables-rounded, .tc-group-tables-square, .tc-standing-group-wrap, .tc-group-seats, .tc-text-group, .tc-group-elements').draggable({
                disabled: false
            });
            $('.tc-wrapper').addClass('tc-map');
            $('.tc-wrapper').removeClass('tc-tier');
            $('#tc-seat-labels-settings, #tc-seats').removeAttr('style');
            $(".tc-group-controls").show();
        });

        $('body').on('click', '.pa-tabs #tab-item-1', function() {
            $('.ui-selectable').selectable({
                filter: '.tc_seat_unit',
                cancel: '.tc_seat_reserved',
                disabled: false
            });
            $('.tc-group-tables-rounded, .tc-group-tables-square, .tc-standing-group-wrap, .tc-group-seats, .tc-text-group, .tc-group-elements').draggable({
                disabled: true
            });
            $('.tc-wrapper').removeClass('tc-map');
            $('.tc-wrapper').addClass('tc-tier');
            $('.tc_seat_unit, .tc-table-chair, .tc-object-selectable').addClass('tc_tier_seat');
            $(".tc-group-controls").hide();
        });

        $("#tc_seat_assign").change(function() {
            $(this).find("option:selected").each(function() {
                var optionValue = $(this).attr("value");
                if (optionValue == 'assigned') {
                    $("#tc-seats").show();
                    $("#tc-standing").hide();
                } else {
                    $("#tc-seats").hide();
                    $("#tc-standing").show();
                }
            });
        }).change();

        /**
         * Zoom Controls Events
         */
        $('body').on('click', '.tc-zoom-wrap .tc-plus-wrap', function(event) {
            tc_controls.zoom_plus();
        });

        $('body').on('click', '.tc-zoom-wrap .tc-minus-wrap', function(event) {
            tc_controls.zoom_minus();
        });

        $('body').on('click', '#collapse-menu', function(event) {
            tc_controls.position_zoom_controls();
        });


        /**
         * Mouse Events
         */

        $('body').on('mousewheel DOMMouseScroll', '.tc-wrapper', function(e) {
            if (e.type == 'DOMMouseScroll') { //Firefox
                scroll = e.originalEvent.detail * (40 * -1);
            } else {
                scroll = e.originalEvent.wheelDelta;
            }
            if (scroll / 120 > 0) {
                tc_controls.zoom_plus();
            } else {
                tc_controls.zoom_minus();
            }
        });


        $('body').on('mouseenter', '.tc-seat-group, .tc-table-group, .tc-element-group, .tc-caption-group', function(e) {
            $(this).parent().css('z-index', 20);
        }).on('mouseleave', '.tc-seat-group, .tc-table-group, .tc-element-group, .tc-caption-group', function(e) {
            $(this).parent().css('z-index', 1);
        });

        /**
         * Sliders
         */
        $("#tc_seating_group_widget .tc-seat-rows-slider .tc-number-slider").slider({
            value: 10,
            min: 1,
            max: 50,
            slide: function(event, ui) {
                $(this).parent().find('.tc-slider-value').val(ui.value);
            },
            create: function(event, ui) {
                var bar = $(this).slider('value');
                $(this).parent().find('.tc-slider-value').val(bar);
            }
        });

        $("#tc_seating_group_widget .tc-seat-cols-slider .tc-number-slider").slider({
            value: 10,
            min: 1,
            max: 50,
            slide: function(event, ui) {
                $(this).parent().find('.tc-slider-value').val(ui.value);
            },
            create: function(event, ui) {
                var bar = $(this).slider('value');
                $(this).parent().find('.tc-slider-value').val(bar);
            }
        });

        $(".tc-zoom-slider").slider({
            value: 1,
            orientation: "horizontal",
            min: 0.30,
            max: 1,
            step: 0.10,
            slide: function(event, ui) {
                var init_zoom = window.tc_seat_zoom_level;
                //console.log('Init Zoom:' + init_zoom);

                $(this).parent().find('.tc-slider-value').val(ui.value);

                window.tc_seat_zoom_level = ui.value;

                tc_controls.zoom();
            },
            create: function(event, ui) {
                var bar = $(this).slider('value');
                $(this).parent().find('.tc-slider-value').val(bar);
            }
        });

        $("#tc_text_widget .tc-number-slider").slider({
            value: 25,
            min: 10,
            max: 100,
            slide: function(event, ui) {
                $(this).parent().find('.tc-slider-value').val(ui.value);
            },
            create: function(event, ui) {
                var bar = $(this).slider('value');
                $(this).parent().find('.tc-slider-value').val(bar);
            }
        });

        $("#tc_standing_widget .tc-number-slider.tc_standing_area_num").slider({
            value: 50,
            min: 2,
            max: 999999,
            slide: function(event, ui) {
                $(this).parent().find('.tc-slider-value').val(ui.value);
            },
            create: function(event, ui) {
                var bar = $(this).slider('value');
                $(this).parent().find('.tc-slider-value').val(bar);
            }
        });

        $("#tc-table .tc-number-slider.tc_table_seats_num").slider({
            value: 4,
            min: 2,
            max: 50,
            slide: function(event, ui) {
                $(this).parent().find('.tc_table_seats_num_value').val(ui.value);

                var max_end_seats = Math.floor(ui.value / 2);

                $("#tc-table .tc-number-slider.tc_table_end_seats").slider('option', { max: max_end_seats });

                if ($('.tc_table_end_seats_value').val() > max_end_seats) {
                    $("#tc-table .tc-number-slider.tc_table_end_seats").slider('value', max_end_seats);
                    $('.tc_table_end_seats_value').val(max_end_seats);
                }

            },
            create: function(event, ui) {
                var bar = $(this).slider('value');
                $(this).parent().find('.tc_table_seats_num_value').val(bar);
            },
        });

        $("#tc-table .tc-number-slider.tc_table_end_seats").slider({
            value: 0,
            min: 0,
            max: 2,
            slide: function(event, ui) {
                $(this).parent().find('.tc_table_end_seats_value').val(ui.value);
            },
            create: function(event, ui) {
                var bar = $(this).slider('value');
                $(this).parent().find('.tc_table_end_seats_value').val(bar);
            }
        });

        /**
         * Color Picker
         */
        function updateIconColor(color) {
            var hexColor = "transparent";
            if (color) {
                hexColor = color.toHexString();
            }
            $("#tc-table .tc-table-color-picker .icon-color").val(hexColor);
        }
        $("#tc-table .tc-table-color-picker .tc-color-picker").spectrum({
            allowEmpty: true,
            color: "#A02541",
            showInput: true,
            containerClassName: "full-spectrum",
            showInitial: true,
            showPalette: false,
            showSelectionPalette: true,
            showAlpha: true,
            preferredFormat: "hex",
            move: function(color) {
                updateIconColor(color);
            },
        });

        function updateElementIconColor(color) {
            var hexColor = "transparent";
            if (color) {
                hexColor = color.toHexString();
            }
            $("#tc_element_widget .tc-element-color-picker .icon-color").val(hexColor);
        }
        $("#tc_element_widget .tc-element-color-picker .tc-color-picker").spectrum({
            allowEmpty: true,
            color: "#ffffff",
            showInput: true,
            containerClassName: "full-spectrum",
            showInitial: true,
            showPalette: false,
            showSelectionPalette: true,
            showAlpha: true,
            preferredFormat: "hex",
            move: function(color) {
                updateElementIconColor(color);
            },
        });

        function updateElementBGColor(color) {
            var hexColor = "transparent";
            if (color) {
                hexColor = color.toHexString();
            }
            $("#tc_element_widget .tc-element-background-color-picker .icon-background-color").val(hexColor);
        }
        $("#tc_element_widget .tc-element-background-color-picker .tc-background-color-picker").spectrum({
            allowEmpty: true,
            color: "#A02541",
            showInput: true,
            containerClassName: "full-spectrum",
            showInitial: true,
            showPalette: false,
            showSelectionPalette: true,
            showAlpha: true,
            preferredFormat: "hex",
            move: function(color) {
                updateElementBGColor(color);
            },
        });

        function updateTextColor(color) {
            var hexColor = "transparent";
            if (color) {
                hexColor = color.toHexString();
            }
            $("#tc_text_widget .tc-color-picker-element .tc_text_color").val(hexColor);
        }
        $("#tc_text_widget .tc-color-picker-element .tc-color-picker").spectrum({
            allowEmpty: true,
            color: "#A02541",
            showInput: true,
            containerClassName: "full-spectrum",
            showInitial: true,
            showPalette: false,
            showSelectionPalette: true,
            showAlpha: true,
            preferredFormat: "hex",
            move: function(color) {
                updateTextColor(color);
            },
        });

        function updateAreaColor(color) {
            var hexColor = "transparent";
            if (color) {
                hexColor = color.toHexString();
            }
            $("#tc-standing .tc-color-picker-standing .tc_standing_color").val(hexColor);
        }
        $("#tc-standing .tc-color-picker-standing .tc-color-picker").spectrum({
            allowEmpty: true,
            color: "#dedede",
            showInput: true,
            containerClassName: "full-spectrum",
            showInitial: true,
            showPalette: false,
            showSelectionPalette: true,
            showAlpha: true,
            preferredFormat: "hex",
            move: function(color) {
                updateAreaColor(color);
            },
        });

        /* Slider for elements */

        $('.tc-select-elements').unslider({
            arrows: false,
            keys: false,
            speed: 180
        });

        /* Get Table & Chairs in Layout */
        $('body').on('click', '#pma_table_chairs', function(e) {
            var startValue = 1,
                startTable = 1;
            for (startValue; startValue <= 3; startValue++) {
                tc_table.table_rounded_chair_table(false, startValue, startValue, -150, 0);
            }
            for (startTable; startTable <= 2; startTable++) {
                var countNumber = parseInt(startTable) + 3;
                tc_table.table_rounded_chair_table(false, countNumber, startTable + .5, -350, 0);
            }
            $(this).off('click');
        });

        $('body').on('click', '#pma_section_rows', function(e) {
            e.preventDefault();
            var startValue = 1,
                leftvalue = 0,
                topValue = 0,
                plusValue = 0,
                areaWidth = 'auto',
                tableValue = 0,
                iconName = 'tc-icon-music',
                titleName = 'Stage';
            for (startValue; startValue <= 2; startValue++) {
                tc_seats.create_section_rows_group(6, 4, startValue, tableValue, -150, 50);
            }
            tc_seats.create_section_rows_group(12, 3, 3, 2, -350, 0);
            if (titleName === 'Stage') {
                topValue = 0;
                areaWidth = 300 * 2;
                leftvalue = 0;
            }
            tc_element.create_mixed(iconName, titleName, leftvalue, topValue, plusValue, areaWidth);
            $(this).off('click');
        });

        /* Create Mixed Layout */
        $('body').on('click', '#pc_mixed_layout', function(e) {
            e.preventDefault();
            var startValue = 1,
                startTable = 1,
                leftvalue = 0,
                topValue = 0,
                plusValue = 0,
                areaWidth = 'auto',
                sectionValue = $('#tc_seat_section_row').val(),
                tableValue = $('#tc_seat_table_row').val();
            if (tableValue != undefined) {
                for (startTable; startTable <= tableValue; startTable++) {
                    tc_table.create_rounded_mixed_table(false, startTable);
                }

            }
            var roundedTableHeight = $('.tc-rounded-table-group').outerHeight(),
                roundedTableHeight = roundedTableHeight + 200;
            if (sectionValue != undefined) {
                if (Number.isNaN(roundedTableHeight)) {
                    var roundedTableHeight = 130,
                        tableValue = 1;
                }
                for (startValue; startValue <= sectionValue; startValue++) {
                    var countNumber = parseInt(startValue) + parseInt(tableValue);
                    tc_seats.create_mixed_group(countNumber, tableValue, roundedTableHeight);
                }
            }
            var getHeight = $('.tc-group-seats').outerHeight(),
                getHeight = getHeight + 50;
            $('#tc_element_mixed_widget input[type=checkbox]:checked').each(function($index) {
                var iconName = $(this).val();
                var titleName = $(this).attr('data-tt-value');
                if (titleName === 'Stage') {
                    topValue = 0;
                    if (sectionValue == undefined) {
                        areaWidth = 280 * parseInt(tableValue);
                    } else {
                        areaWidth = 370 * parseInt(sectionValue);
                    }
                    leftvalue = 0;
                } else if (titleName === "Food") {
                    topValue = parseInt(-((getHeight * 2) + 30));
                    leftvalue = 0;
                    areaWidth = 'auto';
                } else if (titleName === 'Exit') {
                    topValue = parseInt(-((getHeight * 2) + 30));
                    leftvalue = 1;
                    areaWidth = 'auto';
                } else if (titleName === 'Drinks') {
                    topValue = parseInt(-((getHeight * 2) + 30));
                    leftvalue = 2;
                    areaWidth = 'auto';
                } else if (titleName === 'Toilet') {
                    topValue = parseInt(-((getHeight * 2) + 30));
                    leftvalue = 3;
                    areaWidth = 'auto';
                }
                tc_element.create_mixed(iconName, titleName, leftvalue, topValue, plusValue, areaWidth);
            });
            $(this).off('click');
        });

        /**
         * Min Max Length Validation
         */
        var minLength = 8,
            minLengthNew = 3;
        $('#tc_seating_group_title').on('keydown keyup change', function() {
            var charLength = $(this).val().length;
            if (charLength < minLength) {
                $('#tc_seating_group_message').text('Text is short, minimum ' + minLength + ' required.');
                $('#tc_seating_group_message').addClass("text-red");
                $("#tc_add_seats_button").attr("disabled", true);
            } else {
                $('#tc_seating_group_message').text('');
                $("#tc_add_seats_button").attr("disabled", false);
            }
        });

        $('#tc_standing_group_title').on('keydown keyup change', function() {
            var charLength = $(this).val().length;
            if (charLength < minLength) {
                $('#tc_standing_group_message').text('Text is short, minimum ' + minLength + ' required.');
                $('#tc_standing_group_message').addClass("text-red");
                $("#tc_add_standing_button").attr("disabled", true);
            } else {
                $('#tc_standing_group_message').text('');
                $("#tc_add_standing_button").attr("disabled", false);
            }
        });

        $('.tc_table_title').on('keydown keyup change', function() {
            var charLength = $(this).val().length;
            if (charLength < minLength) {
                $('#tc_table_message').text('Text is short, minimum ' + minLength + ' required.');
                $('#tc_table_message').addClass("text-red");
                $("#tc_add_table_button").attr("disabled", true);
            } else {
                $('#tc_table_message').text('');
                $("#tc_add_table_button").attr("disabled", false);
            }
        });

        $('.tc_text_title').on('keydown keyup change', function() {
            var charLength = $(this).val().length;
            if (charLength < minLength) {
                $('#tc_text_message').text('Text is short, minimum ' + minLength + ' required.');
                $('#tc_text_message').addClass("text-red");
                $("#tc_add_text_button").attr("disabled", true);
            } else {
                $('#tc_text_message').text('');
                $("#tc_add_text_button").attr("disabled", false);
            }
        });

        $('.tc_element_title').on('keydown keyup change', function() {
            var charLength = $(this).val().length;
            if (charLength < minLengthNew) {
                $('#tc_element_title_message').text('Maximum ' + maxLength + ' characters are allowed.');
                $('#tc_element_title_message').addClass("text-red");
                $("#tc_add_element_button").attr("disabled", true);
            } else {
                $('#tc_element_title_message').text('');
                $("#tc_add_element_button").attr("disabled", false);
            }
        });

        /**
         * Initialize Components
         */
        tc_controls.position_zoom_controls();
        tc_controls.get_event_ticket_types();
        tc_controls.set_wrapper_height();

        tc_controls.init();
        tc_seats.init();
        tc_text.init();
        tc_table.init();
        tc_element.init();
        tc_standing.init();

        $('.tc_col_label_invert').click(function(e) {
            var col_sign_from = $('#tc_seat_sign_settings_multi_seat_col_sign_from').val();
            var col_sign_to = $('#tc_seat_sign_settings_multi_seat_col_sign_to').val();

            $('#tc_seat_sign_settings_multi_seat_col_sign_from').val(col_sign_to);
            $('#tc_seat_sign_settings_multi_seat_col_sign_to').val(col_sign_from);
        });
    }, 2000);
});