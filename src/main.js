/**
 * Функция для расчёта выручки
 * @param {Object} purchase запись о покупке
 * @param {Object} product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, product) {
    const {
        discount = 0,
        sale_price,
        quantity
    } = purchase;

    const fullPrice = sale_price * quantity;

    return fullPrice * (1 - discount / 100);
}

/**
 * Функция для расчёта бонусов
 * @param {number} index порядковый номер продавца
 * @param {number} total общее число продавцов
 * @param {Object} seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;

    if (index === 0) {
        return profit * 0.15;
    }

    if (index === 1 || index === 2) {
        return profit * 0.10;
    }

    if (index === total - 1) {
        return 0;
    }

    return profit * 0.05;
}

/**
 * Функция для анализа данных продаж
 */
function analyzeSalesData(data, options) {

    // Проверка входных данных
    if (
        !data ||
        !Array.isArray(data.sellers) ||
        !Array.isArray(data.products) ||
        !Array.isArray(data.purchase_records) ||
        data.sellers.length === 0 ||
        data.products.length === 0 ||
        data.purchase_records.length === 0
    ) {
        throw new Error(
            'Данные должны содержать непустые массивы sellers, products и purchase_records'
        );
    }

    // Проверка функций
    if (
        !options ||
        typeof options !== 'object' ||
        typeof options.calculateRevenue !== 'function' ||
        typeof options.calculateBonus !== 'function'
    ) {
        throw new Error(
            'options должен содержать функции calculateRevenue и calculateBonus'
        );
    }

    const { calculateRevenue, calculateBonus } = options;

    // Подготовка статистики продавцов
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {},
        bonus: 0
    }));

    // Индекс продавцов
    const sellerIndex = Object.fromEntries(
        sellerStats.map(seller => [seller.id, seller])
    );

    // Индекс товаров
    const productIndex = Object.fromEntries(
        data.products.map(product => [product.sku, product])
    );

    // 🟢 ИСПРАВЛЕНО: весь расчёт находится внутри forEach.
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];

        // Пропускаем запись, если продавец не найден
        if (!seller) return;

        seller.sales_count++;

        // Обрабатываем товары в чеке
        record.items.forEach(item => {
            const product = productIndex[item.sku];

            if (!product) return;

            const cost = product.purchase_price * item.quantity;

            const revenue = calculateRevenue(item, product);

            const profit = revenue - cost;

            seller.revenue += revenue;
            seller.profit += profit;

            // 🟢 ИСПРАВЛЕНО: точка вместо запятой.
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }

            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // Сортировка продавцов по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    // 🟢 ИСПРАВЛЕНО: правильное имя sellerStats.
    sellerStats.forEach((seller, index) => {

        // Рассчитываем бонус
        seller.bonus = calculateBonus(
            index,
            sellerStats.length,
            seller
        );

        // Формируем топ-10 проданных товаров
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({
                sku,
                quantity
            }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // Подготовка итогового отчёта
    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: Number(seller.revenue.toFixed(2)),
        profit: Number(seller.profit.toFixed(2)),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: Number(seller.bonus.toFixed(2))
    }));
}