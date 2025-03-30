jQuery(document).ready(function($) {
    //Standing Events

    $('body').on('click', '.tc-standing-group-wrap .tc-element-group .tc-group-controls .tc-icon-copy', function(e) {
        e.preventDefault();
        tc_standing.copy($(this));
    });
    $('body').on('click', '.tc-standing-group-wrap .tc-element-group .tc-group-controls .tc-icon-trash', function(e) {
        e.preventDefault();
        tc_standing.delete($(this));
        $(this).off("click");
    });
    $('body').on('click', '.tc-standing-group-wrap .tc-element-group .tc-group-controls .tc-icon-edit', function() {
        tc_standing.edit_mode($(this));
        $('#tc-seats').hide();
        $('#tc-standing').show();
        $('#tc_seat_assign').val('general');
        $(".tc-sidebar").find(".dataContent").removeClass("activeContent");
        $(".tc-sidebar").find(".expandCollapse").removeClass("active");
        $(".tc-sidebar .md-section").find(".dataContent").addClass("activeContent");
        $(".tc-sidebar .md-section").find(".expandCollapse").addClass("active");
        $(this).off("click");
    });

    $('body').on('click', '#tc_edit_standing_button', function(e) {
        e.preventDefault();
        tc_standing.edit();
        $(this).off("click");
    });

    $('body').on('click', '#tc_cancel_standing_button', function(e) {
        e.preventDefault();
        tc_standing.cancel_edit();
        $(this).off("click");
    });

    function updateAreaColor(color) {
        var hexColor = "transparent";
        if (color) {
            hexColor = color.toHexString();
        }
        $("#tc-standing .tc-color-picker-standing .tc_standing_color").val(hexColor);
    }

    window.tc_standing = {
        /**
         * Creates new element
         * @returns {undefined}
         */
        edit: function() {
            var ticket_type_num = $('#tc_standing_widget #tc_standing_num').val();
            var title = $('#tc_standing_group_title').val();
            var holder = $('.tc-standing-group-wrap.tc-edit-mode');
            if (title == '') {
                title = '&nbsp;';
                holder.find('.tc-heading').addClass('tc-empty-header');
            } else {
                holder.find('.tc-heading').removeClass('tc-empty-header');
            }

            holder.find('.tc-heading h3').html(title);
            var seats = $("#tc_standing_widget .tc-slider-value.tc_standing_area_num_value").val();
            $('#tc_standing_widget .tc-number-slider.tc_standing_area_num').slider('value', seats);
            if ($('#tc_standing_widget').is(":visible")) { //if ticket type edit is allowed
                $('.tc-standing-group-wrap.tc-edit-mode .tc-object-selectable').attr('data-tt-id', ticket_type_num);
                $('.tc-standing-group-wrap.tc-edit-mode .tc-object-selectable').html('<div>Capacity <br>' + ticket_type_num + '</div>');
                var tc_seat_color = $('#tc_standing_widget .tc_standing_color').val();
                $('.tc-standing-group-wrap.tc-edit-mode .tc-object').animate({ 'background-color': tc_seat_color }, 250);
                $('.tc-standing-group-wrap.tc-edit-mode .tc-object-selectable').removeClass('tc_set_seat');
                $('.tc-standing-group-wrap.tc-edit-mode .tc-object-selectable').addClass('tc_set_seat');
                $('.tc-standing-group-wrap.tc-edit-mode .tc-object-selectable').removeClass('ui-selected');
            }
            tc_controls.set_default_settings_values();
        },
        cancel_edit: function() {
            $('#tc-seat-labels-settings').hide();
            tc_controls.hide_ticket_type_box();
            tc_controls.set_default_settings_values();
            tc_controls.unselect_all();
        },
        create: function() {
            var grid_size = 5;
            var title = $('#tc_standing_widget #tc_standing_group_title').val();
            var text_html = '';
            var color = '#a02541'; //$('#tc_standing_widget .color').val();
            var background_color_style = '';
            var color_style = '';
            var next_part_no = tc_controls.next_part_number();
            var no = 1;
            var ticket_type_num = $('#tc_standing_widget #tc_standing_num').val();
            var tc_seat_color = $('#tc_standing_widget .tc_standing_color').val();
            var empty_class = 'tc-empty-header';

            if (ticket_type_num !== undefined && ticket_type_num != null && ticket_type_num.length > 0) {
                background_color_style = 'style="background-color:' + tc_seat_color + ';-moz-box-shadow: 0 0 8px 1px rgba(0, 0, 0, 0.05); -webkit-box-shadow: 0 0 8px 1px rgba(0, 0, 0, 0.05);box-shadow: 0 0 8px 1px rgba(0, 0, 0, 0.05); width: 200px; height: 130px;"';

                if (color !== '') {
                    color_style = 'style="color:' + color + '"';
                }

                if (title == '') {
                    title = '&nbsp;';
                } else {
                    empty_class = '';
                }

                text_html += '<div class="tc-group-wrap tc-standing-group-wrap">';
                text_html += '<div class="tc-element-group">';
                text_html += '<div class="tc-heading ' + empty_class + '"><h3 ' + color_style + '>' + title + '</h3></div>';
                text_html += '<div class="tc-object" ' + background_color_style + ' data-tt-color="' + tc_seat_color + '"><div class="tc-object-selectable tc_set_seats" id="tc_seat_' + next_part_no + '_' + no + '" data-tt-id="' + ticket_type_num + '"><div>Capacity <br/>' + ticket_type_num + '</div></div></div>';
                text_html += '<div class="tc-group-controls"><span class="tc-icon-edit"></span><span class="tc-icon-trash"></span><span class="tc-icon-copy"></span></div>';
                text_html += '</div></div>';
                var text = text_html;
                var new_element = tc_standing.add_to_canvas(text, new Array(1, 1), true);
                tc_controls.center($(new_element));
                try {
                    $(new_element).find('.tc-element-group').rotatable();
                    $(new_element).find('.tc-element-group').resizable({
                        handles: 'ne, se, sw, nw, n, e, s, w, all',
                        minHeight: 50,
                        minWidth: 50,
                        autoHide: true,
                        create: function(event, ui) {
                            $('.ui-resizable-se').removeClass('ui-icon-gripsmall-diagonal-se ui-icon');
                        }
                    }).on('resize', function(e) {
                        $(this).find('.tc-element-group').height($(this).height());
                        $(this).find('.tc-element-group').width($(this).width());
                        $(this).find('.tc-object').height($(this).height() - 35);
                        $(this).find('.tc-object').width($(this).width());
                    });
                    $(new_element).find('.tc-object').selectable({
                        filter: '.tc-object-selectable',
                        cancel: '.tc_seat_reserved',
                        disabled: true,
                        stop: function(event, ui) {
                            tc_controls.show_ticket_type_box(event, ui, false);
                            tc_controls.show_tier_assign(event, ui);
                        }
                    });
                    $(new_element).draggable({
                        grid: [grid_size, grid_size],
                        handle: $(new_element).find('.tc-element-group .tc-heading'),
                        start: function(event, ui) {
                            ui.position.left = 0;
                            ui.position.top = 0;
                        },
                        drag: function(event, ui) {

                            var changeLeft = ui.position.left - ui.originalPosition.left; // find change in left
                            var newLeft = (ui.originalPosition.left + changeLeft) / window.tc_seat_zoom_level; // adjust new left by our zoomScale

                            var changeTop = ui.position.top - ui.originalPosition.top; // find change in top
                            var newTop = (ui.originalPosition.top + changeTop) / window.tc_seat_zoom_level; // adjust new top by our zoomScale

                            ui.position.left = newLeft;
                            ui.position.top = newTop;
                        }
                    });

                } catch (e) {
                    return null;
                }
            } else {
                //ticket type is not selected = do nothing
            }
            tc_controls.set_default_settings_values();
        },
        /**
         * Delete an element
         * @param {type} element_obj
         * @returns {undefined}
         */
        delete: function(element_obj) {
            tc_controls.delete_confirmation(element_obj.parent().parent().parent());
        },
        /**
         * Make a copy of an element
         * @param {type} element_obj
         * @returns {undefined}
         */
        copy: function(element_obj) {
            //to do
        },
        /**
         * Appends HTML to the wrapper / adds new element on the canvas
         * @param {type} html
         * @param {type} position
         * @param {type} draggable
         * @returns {Window.tc_text.add_to_canvas.element|window.tc_text.add_to_canvas.element|window.$|$}
         */
        add_to_canvas: function(html, position, draggable) {
            var element = $(html);
            element.appendTo('.tc-wrapper .tc-pan-wrapper');
            return element;
        },
        edit_mode: function(obj) {
            //remove all previous "edit mode" classes
            $('.tc-group-wrap').removeClass('tc-edit-mode');
            //mark that object is in the edit mode
            var holder = obj.parent().parent().parent();
            holder.addClass('tc-edit-mode');

            var title = holder.find('.tc-heading h3').html();

            if (title == '&nbsp;') {
                title = '';
            }

            if (holder.find('.tc_seat_reserved').length) { //check if there are some reserved seats
                $('#tc_standing_widget .tc-assign-ticket-type').hide();
            } else {
                $('#tc_standing_widget .tc-assign-ticket-type').show();
            }

            var ticket_type = holder.find('.tc-object-selectable').attr('data-tt-id');
            var standing_color = holder.find('.tc-object').attr('data-tt-color');

            if (isNaN(ticket_type)) {
                //do nothing because ticket type is not assigned yet
            } else {
                $("#tc_standing_num").val(ticket_type).change();
                $('#tc_standing_widget .tc-number-slider.tc_standing_area_num').slider('value', ticket_type);
                $("#tc-standing .tc-color-picker-standing .tc-color-picker").spectrum({
                    allowEmpty: true,
                    color: standing_color,
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
            }

            $('#tc_standing_widget #tc_standing_group_title').val(title);
            $('#tc_standing_widget .tc_seat_edit_controls').show();
            $('#tc_standing_widget .tc_seat_add_controls').hide();
        },
        init: function() {
            var grid_size = 5;
            $('.tc-group-wrap.tc-standing-group-wrap').each(function() {
                $(this).find('.tc-icon-rotate').remove();
                $(this).find('.ui-resizable-handle').remove();
                $(this).find('.tc-element-group').rotatable();
                $(this).find('.tc-element-group').resizable({
                    handles: 'ne, se, sw, nw, n, e, s, w, all',
                    minHeight: 50,
                    minWidth: 50,
                    autoHide: true,
                    create: function(event, ui) {
                        $('.ui-resizable-se').removeClass('ui-icon-gripsmall-diagonal-se ui-icon');
                    }
                }).on('resize', function(e) {
                    $(this).find('.tc-element-group').height($(this).height());
                    $(this).find('.tc-element-group').width($(this).width());
                    $(this).find('.tc-object').height($(this).height() - 35);
                    $(this).find('.tc-object').width($(this).width());
                });
                $(this).find('.tc-object').selectable({
                    filter: '.tc-object-selectable',
                    cancel: '.tc_seat_reserved',
                    disabled: true,
                    stop: function(event, ui) {
                        tc_controls.show_ticket_type_box(event, ui, false);
                        tc_controls.show_tier_assign(event, ui);
                    }
                });
                $(this).draggable({
                    grid: [grid_size, grid_size],
                    handle: $(this).find('.tc-element-group .tc-heading'),
                    start: function(event, ui) {
                        ui.position.left = 0;
                        ui.position.top = 0;
                    },
                    drag: function(event, ui) {

                        var changeLeft = ui.position.left - ui.originalPosition.left; // find change in left
                        var newLeft = (ui.originalPosition.left + changeLeft) / window.tc_seat_zoom_level; // adjust new left by our zoomScale

                        var changeTop = ui.position.top - ui.originalPosition.top; // find change in top
                        var newTop = (ui.originalPosition.top + changeTop) / window.tc_seat_zoom_level; // adjust new top by our zoomScale

                        ui.position.left = newLeft;
                        ui.position.top = newTop;
                    }
                });
            });
        }
    }
});