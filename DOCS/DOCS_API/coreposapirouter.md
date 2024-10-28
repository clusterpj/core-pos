     // CorePos
        Route::resource('/core-pos/cash-history', CashHistoryController::class);
        Route::get('/core-pos/get-cash-history', [ CashHistoryController::class, 'getCashRegisterHistories']);
        Route::post('/core-pos/confirm-open/{id}', [ CashHistoryController::class, 'confirmOpenCashRegister']);
        Route::post('/core-pos/register-income-withdrawal', [ CashHistoryController::class, 'storeIncomeWithdrawalCash']);
        Route::get('/core-pos/show-income-withdrawal', [ CashHistoryController::class, 'showIncomeWithdrawalCash']);

        // Cash Register Dashboard //
        Route::resource('/core-pos/dashboard', DashboardCorePosController::class);
        Route::post('/dashboard-pos/cash-histories', [DashboardCorePosController::class, 'dataCashHistories']);
        Route::post('/dashboard-pos/income-withdrawal', [DashboardCorePosController::class, 'dataIncomeWithdrawalCash']);

        // Cash Register //
        Route::get('/core-pos/cash-register/getCashAmountPayments', [CorePosController::class, 'getInvoicesCashPayment']);
        Route::post('/core-pos/cash-register/getUserAssignCashRegister', [CorePosController::class, 'getUserAssignCashRegister']);
        Route::post('/core-pos/cash-register/userAssignCashRegister', [CorePosController::class, 'userAssignCashRegister']);
        Route::get('/core-pos/cash-register/getCashRegistersUser', [CorePosController::class, 'getCashRegistersUser']);
        Route::get('/core-pos/cash-register/getCashRegistersUserall', [CorePosController::class, 'getCashRegistersUserall']);
        Route::post('/core-pos/cash-register/getCashRegisters', [CorePosController::class, 'getCashRegisters']);
        Route::get('/core-pos/cash-register/getCashRegister/{id}', [CorePosController::class, 'getCashRegister']);
        Route::post('/core-pos/cash-register/getUsers', [CorePosController::class, 'getUsers']);
        Route::post('/core-pos/cash-register/addCashRegister', [CorePosController::class, 'addCashRegister']);
        Route::post('/core-pos/cash-register/updateCashRegister', [CorePosController::class, 'updateCashRegister']);
        Route::get('/core-pos/cash-register/deleteCashRegister/{id}', [CorePosController::class, 'deleteCashRegister']);
        // Money //
        Route::post('/core-pos/money/getMoney', [CorePosController::class, 'getMoney']);
        Route::post('/core-pos/money/addMoney', [CorePosController::class, 'addMoney']);
        Route::post('/core-pos/money/updateMoney', [CorePosController::class, 'updateMoney']);
        Route::get('/core-pos/money/deleteMoney/{id}', [CorePosController::class, 'deleteMoney']);
        Route::resource('/core-pos/item-categories/', PosItemCategoryController::class);
        Route::get('/core-pos/get-item-categories', [PosItemCategoryController::class, 'getPosItemCategoriesCompany']);
        Route::post('/core-pos/sections', [CorePosController::class, 'getSections']);
        Route::post('/core-pos/sections/create', [CorePosController::class, 'createSections']);
        Route::post('/core-pos/sections/update', [CorePosController::class, 'updateSections']);
        // Table //

        Route::get('/core-pos/table-cash-register/{id}', [TableController::class , 'getTablesCashRegister']);
        Route::post('/core-pos/get-tables', [TableController::class , 'getTables']);
        Route::resource('/core-pos/tables', TableController::class);
        //
        Route::resource('/core-pos/payment-methods/', PosPaymentMethodsController::class);
        Route::get('/core-pos/get-payment-methods', [PosPaymentMethodsController::class, 'getPosPaymentMethodsCompany']);
        // hold invoices core pos
        Route::resource('/core-pos/hold-invoices', HoldInvoiceController::class);
        Route::post('core-pos/hold-invoice/delete', [HoldInvoiceController::class, 'deleteHoldInvoice']);