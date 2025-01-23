var tblProducts;
var select_client, select_search_product;
var tblSearchProducts;
// let coordClient = false;
var action = $('input[name="action"]').val();


var sale = {
    details: {
        subtotal_exempt: 0.00,
        subtotal: 0.00,
        iva: 0.00,
        discount: 0.00,
        total: 0.00,
        products: [],
        products_review: []
    },
    getProductsIds: function () {
        return this.details.products.map(value => value.id);
    },
    calculateInvoice: function () {
        var subtotal_exempt = 0.00;
        var subtotal_iva = 0.00;
        // var iva = $('input[name="iva"]').val();
        var discount = $('input[name="discount"]').val();
        this.details.products.forEach(function (value, index, array) {
            value.index = index;
            if (!value.restore) {
                if (value.tax === 'e' || value.tax === 'exento') {
                    value.cant = parseInt(value.cant);
                    value.subtotal = value.cant * parseFloat(value.pvp);
                    subtotal_exempt += value.subtotal;
                } else if (value.tax === 'grabado') {
                    value.cant = parseInt(value.cant);
                    value.subtotal = value.cant * parseFloat(value.pvp);
                    subtotal_iva += value.subtotal;
                }
            }
        });

        this.details.subtotal_exempt = subtotal_exempt;
        this.details.subtotal = subtotal_iva;
        this.details.discount = discount;

        this.details.iva = this.details.subtotal * 0.15;
        this.details.total = ((this.details.subtotal + this.details.subtotal_exempt) - this.details.discount) + this.details.iva;

        $('input[name="subtotal"]').val(this.details.subtotal.toFixed(2));
        $('input[name="subtotal_exempt"]').val(this.details.subtotal_exempt.toFixed(2));
        $('input[name="ivacalc"]').val(this.details.iva.toFixed(2));
        $('input[name="total"]').val(this.details.total.toFixed(2));
    },
    addProduct: function (item) {
        this.details.products.push(item);
        this.listProducts();
    },
    listProducts: function () {
        var action = $('input[name="action"]').val();
        this.calculateInvoice();
        tblProducts = $('#tblProducts').DataTable({
            responsive: true,
            autoWidth: false,
            destroy: true,
            data: this.details.products,
            columns: [
                {"data": "id"},
                {"data": "restore"},
                {"data": "full_name"},
                {"data": "stock"},
                {"data": "pvp"},
                {"data": "cant"},
                {"data": "subtotal"},
            ],
            columnDefs: [
                {
                    targets: '_all',
                    class: 'text-center',
                },
                {
                    targets: [0],
                    visible: false,
                },
                {
                    targets: [1],
                    render: function (data, type, row) {
                        var check = ` <div class="form-check form-switch">`
                        if (action === 'edit') {
                            if (data === false) {
                                check += '<input class="form-check-input" type="checkbox"  rel="restore">'
                            } else {
                                check += '<input class="form-check-input" type="checkbox"  rel="restore" checked>'
                            }
                        } else if (action === 'add') {
                            check += '<input class="form-check-input" type="checkbox"  rel="restore" disabled>'
                        }
                        check += `</div>`
                        return check;

                    }
                },
                {
                    targets: [2],
                    orderable: false,
                    render: function (data, type, row) {
                        return '<a rel="remove" style="color: blue; cursor: pointer">' + data + '</a>';
                    }
                },
                {
                    targets: [-4],
                    orderable: false,
                    render: function (data, type, row) {
                        if (!row.is_inventoried) {
                            return `<span class="badge bg-secondary">Sin stock</span>`
                        }
                        return `<span class="badge bg-secondary">${data}</span>`
                    }
                },
                {
                    targets: [-3],
                    orderable: false,
                    render: function (data, type, row) {
                        return parseFloat(data).toFixed(2);
                    }
                },
                {
                    targets: [-2],
                    orderable: false,
                    render: function (data, type, row) {
                        return '<input type="text" name="cant" class="form-control form-control-sm" autocomplete="off" value="' + row.cant + '">';
                    }
                },
                {
                    targets: [-1],
                    orderable: false,
                    render: function (data, type, row) {
                        return parseFloat(data).toFixed(2);
                    }
                },
            ],
            rowCallback(row, data, displayNum, displayIndex, dataIndex) {
                $(row).find('input[name="cant"]').TouchSpin({
                    min: 1,
                    max: data.stock === 0 ? data.cant : data.stock + data.cant,
                    step: 1
                });

            },
        });
    },
};

$(function () {

    select_client = $('select[name="client"]');
    select_search_product = $('select[name="search_product"]');

    $('.select2').select2({
        theme: "bootstrap4",
        language: 'es'
    });

    // Client

    select_client.select2({
        theme: "bootstrap4",
        language: 'es',
        allowClear: true,
        ajax: {
            delay: 250,
            type: 'POST',
            url: pathname,
            headers: {
                'X-CSRFToken': csrftoken
            },
            data: function (params) {
                return {
                    term: params.term,
                    action: 'search_client'
                };
            },
            processResults: function (data) {
                return {
                    results: data
                };
            },
        },
        placeholder: 'Ingrese una descripción',
        minimumInputLength: 1,
    })
        .on('select2:select', function (e) {
            var data = e.params.data;

            $.ajax({
                url: window.location.pathname,
                type: 'POST',
                data: {'action': 'search_if_exits_client', 'id_client': data.id},
                dataType: 'json',
                headers: {
                    'X-CSRFToken': csrftoken
                }
            }).done(function (data) {
                if (data.exists) {
                    Swal.fire({
                        title: "Notificación",
                        text: "El cliente seleccionado ya cuenta con una venta",
                        icon: "warning",
                        confirmButtonColor: "#3085d6",
                        confirmButtonText: "Ok!"
                    }).then((result) => {
                        if (result.isConfirmed) {
                            location.href = data.success_url;
                        }
                    });
                }
                // else {
                //     var lat = e.params.data.lat;
                //     console.log(lat)
                //     if (lat != null || lat != undefined) {
                //         coordClient = true;
                //     } else {
                //         coordClient = false;
                //     }
                // }

            })
        });

    $('.btnAddClient').on('click', function () {
        $('#myModalClient').modal('show');
    });

    $('#myModalClient').on('hidden.bs.modal', function (e) {
        $('#frmClient').trigger('reset');
    });

    // $('input[name="birthdate"]').datetimepicker({
    //     useCurrent: false,
    //     format: 'YYYY-MM-DD',
    //     locale: 'es',
    //     keepOpen: false,
    //     maxDate: new Date()
    // });
    //
    // $('input[name="end"]').datetimepicker({
    //     useCurrent: false,
    //     format: 'YYYY-MM-DD',
    //     locale: 'es',
    //     keepOpen: false,
    // });

    $('#frmClient').on('submit', function (e) {
        e.preventDefault();
        var parameters = new FormData(this);
        parameters.append('action', 'create_client');
        submit_with_ajax(pathname, 'Notificación',
            '¿Estas seguro de crear al siguiente Cliente?', parameters, function (response) {
                //console.log(response);
                var newOption = new Option(response.full_name, response.id, false, true);
                select_client.append(newOption).trigger('change');
                $('#myModalClient').modal('hide');
            });
    });

    select_search_product.select2({
        theme: "bootstrap4",
        language: 'es',
        allowClear: true,
        ajax: {
            delay: 250,
            type: 'POST',
            url: pathname,
            headers: {
                'X-CSRFToken': csrftoken
            },
            data: function (params) {
                return {
                    term: params.term,
                    action: 'search_products_select2',
                    ids: JSON.stringify(sale.getProductsIds())
                };
            },
            processResults: function (data) {
                return {
                    results: data
                };
            },
        },
        placeholder: 'Ingrese una descripción',
        minimumInputLength: 1,
        templateResult: function (repo) {
            if (repo.loading) {
                return repo.text;
            }

            if (!Number.isInteger(repo.id)) {
                return repo.text;
            }

            var stock = repo.is_inventoried ? repo.stock : 'Sin stock';

            var tax = '';

            if (repo.tax === 'e' || repo.tax === 'exento') {
                tax = 'Exento';
            } else if (repo.tax === 'g' || repo.tax === 'grabado') {
                tax = 'Grabado'
            }
            return $(
                '<div class="wrapper container">' +
                '<div class="row">' +
                // '<div class="col-lg-1">' +
                // '<img alt="" src="' + repo.image + '" class="img-fluid img-thumbnail d-block mx-auto rounded">' +
                // '</div>' +
                '<div class="col-lg-11 text-left shadow-sm">' +
                //'<br>' +
                '<p style="margin-bottom: 0;">' +
                '<b>Nombre:</b> ' + repo.full_name + '<br>' +
                '<b>Stock:</b> ' + stock + '<br>' +
                '<b>PVP:</b> <span class="badge badge-warning">$' + repo.pvp + '</span>' + '<br>' +
                '<b>Tipo:</b> <span class="badge badge-dark">' + tax + '</span>' +
                '</p>' +
                '</div>' +
                '</div>' +
                '</div>');
        },
    })
        .on('select2:select', function (e) {
            var data = e.params.data;
            if (!Number.isInteger(data.id)) {
                return false;
            }
            data.cant = 1;
            data.subtotal = 0.00;
            sale.addProduct(data);
            select_search_product.val('').trigger('change.select2');
        });

    $('#tblProducts tbody')
        .off()
        .on('click', 'a[rel="remove"]', function () {
            var tr = tblProducts.cell($(this).closest('td, li')).index();
            alert_action('Notificación', '¿Estas seguro de eliminar el producto de tu detalle?',
                function () {
                    sale.details.products.splice(tr.row, 1);
                    tblProducts.row(tr.row).remove().draw();
                    sale.calculateInvoice();
                }, function () {

                });
        })
        .on('change', 'input[name="cant"]', function () {
            console.clear();
            var cant = parseInt($(this).val());
            var tr = tblProducts.cell($(this).closest('td, li')).index();
            sale.details.products[tr.row].cant = cant;
            sale.calculateInvoice();
            $('td:last', tblProducts.row(tr.row).node()).html(sale.details.products[tr.row].subtotal.toFixed(2));
        })
        .on('click', 'input[rel="restore"]', function () {
            console.clear();
            var cant = parseInt($(this).val());
            let tr = tblProducts.cell($(this).closest('td, li')).index();
            const _this = $(this);

            if (_this.prop('checked')) {
                sale.details.products[tr.row].restore = true
                let s = 0.00
                $('td:last', tblProducts.row(tr.row).node()).html(s.toFixed(2));

            } else {
                sale.details.products[tr.row].restore = false
                $('td:last', tblProducts.row(tr.row).node()).html(sale.details.products[tr.row].subtotal.toFixed(2));

            }
            sale.calculateInvoice();
        })

    $('.btnRemoveAll').on('click', function () {
        if (sale.details.products.length === 0) return false;
        alert_action('Notificación', '¿Estas seguro de eliminar todos los details de tu detalle?', function () {
            sale.details.products = [];
            sale.listProducts();
        }, function () {

        });
    });

    $('.btnClearSearch').on('click', function () {
        select_search_product.val('').focus();
    });

    $('.btnSearchProducts').on('click', function () {
        tblSearchProducts = $('#tblSearchProducts').DataTable({
            responsive: true,
            autoWidth: false,
            destroy: true,
            deferRender: true,
            ajax: {
                url: pathname,
                type: 'POST',
                data: {
                    'action': 'search_products',
                    'ids': JSON.stringify(sale.getProductsIds()),
                    'term': select_search_product.val()
                },
                dataSrc: "",
                headers: {
                    'X-CSRFToken': csrftoken
                },
            },
            columns: [
                {"data": "full_name"},
                {"data": "image"},
                {"data": "stock"},
                {"data": "pvp"},
                {"data": "id"},
            ],
            columnDefs: [
                {
                    targets: [-4],
                    class: 'text-center',
                    orderable: false,
                    render: function (data, type, row) {
                        return '<img src="' + data + '" class="img-fluid d-block mx-auto" style="width: 20px; height: 20px;">';
                    }
                },
                {
                    targets: [-3],
                    class: 'text-center',
                    render: function (data, type, row) {
                        if (!row.is_inventoried) {
                            return '<span class="badge badge-secondary">Sin stock</span>';
                        }
                        return '<span class="badge badge-secondary">' + data + '</span>';
                    }
                },
                {
                    targets: [-2],
                    class: 'text-center',
                    orderable: false,
                    render: function (data, type, row) {
                        return '$' + parseFloat(data).toFixed(2);
                    }
                },
                {
                    targets: [-1],
                    class: 'text-center',
                    orderable: false,
                    render: function (data, type, row) {
                        var buttons = '<a rel="add" class="btn btn-success btn-xs btn-flat"><i class="fas fa-plus"></i></a> ';
                        return buttons;
                    }
                },
            ],
            initComplete: function (settings, json) {

            }
        });
        $('#myModalSearchProducts').modal('show');
    });

    $('#tblSearchProducts tbody')
        .off()
        .on('click', 'a[rel="add"]', function () {
            var tr = tblSearchProducts.cell($(this).closest('td, li')).index();
            var product = tblSearchProducts.row(tr.row).data();
            product.cant = 1;
            product.subtotal = 0.00;
            sale.addProduct(product);
            tblSearchProducts.row($(this).parents('tr')).remove().draw();
        });

    // Form Sale

    // $('#date_joined').datetimepicker({
    //     format: 'YYYY-MM-DD',
    //     useCurrent: false,
    //     locale: 'es',
    //     orientation: 'bottom',
    //     keepOpen: false
    // });

    // $("input[name='iva']").TouchSpin({
    //     min: 0,
    //     max: 1,
    //     step: 0.01,
    //     decimals: 2,
    //     boostat: 5,
    //     maxboostedstep: 10,
    //     postfix: '%'
    // }).on('change', function () {
    //     sale.calculateInvoice();
    // }).val(0.15);

    $("input[name='discount']").TouchSpin({
        min: 0,
        max: 1000000,
        step: 0.01,
        decimals: 2,
        boostat: 5,
        maxboostedstep: 10,
        // postfix: 'C$'
    }).on('change', function () {
        sale.calculateInvoice();
    })

    $('#frmSale').on('submit', function (e) {
        e.preventDefault();

        if (sale.details.products.length === 0) {
            message_error('Debe al menos tener un item en su detalle de venta');
            return false;
        }

        // if (action == 'add') {
        //     if (!coordClient) {
        //         message_error('Favor de Geo localizar al cliente');
        //         return false;
        //     }
        // }


        var success_url = this.getAttribute('data-url');
        var parameters = new FormData(this);
        parameters.append('products', JSON.stringify(sale.details.products));
        parameters.append('products_review', JSON.stringify(sale.details.products_review));
        // parameters.append('coords', false);
        submit_with_ajax(pathname, 'Notificación',
            '¿Estas seguro de realizar la siguiente acción?', parameters, function (response) {
                alert_action('Notificación', '¿Desea imprimir la factura de venta?', function () {
                    window.open('/pos/sale/invoice/pdf/' + response.id + '/', '_blank');
                    location.href = success_url;
                }, function () {
                    location.href = success_url;
                });
            });
    });

    const calculateCanceled = () => {
        let today = $('#id_days').val()
        let end = $('#id_end')
        let date = new Date().getTime() + (today * 24 * 60 * 60 * 1000);
        let f = new Date(date).toLocaleDateString().split('/').reverse();
        let canceledDate = f.join('-');
        end.val(canceledDate)
    }

    if ($('#id_payment').val() == 'credit') {
        $('#block-credit').css('display', 'flex');
    }

    $('#id_payment').on('change', function () {
        let _this = $(this).val();

        if (_this == 'credit') {
            $('#block-credit').css('display', 'flex');
            calculateCanceled()
        } else {
            $('#block-credit').css('display', 'none');
        }
    })


    $('#id_days').on('change', function () {
        calculateCanceled()

    })

    $('input[type="checkbox"]').on('change', function (e) {
        let frequent = $('#id_frequent').prop('checked');
        let is_active = $('#id_is_active').prop('checked');

        if ((frequent && !is_active) && this.checked) {
            message_error({'Error de seleccion': 'Favor de desmarcar frecuente si tendrá días específicos de visita'})
        } else if (frequent && this.checked) {
            message_error({'Error de seleccion': 'Favor de desmarcar frecuente si tendrá días específicos de visita'})
        }
    });

    sale.listProducts();
});

