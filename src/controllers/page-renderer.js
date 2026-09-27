function createPageRenderer(page, title) {
    return function renderPage(req, res) {
        res.render(`pages/${page}`, {
            title: `Closet Drii | ${title}`,
            pageStyle: page,
            pageScript: page,
        });
    };
}

module.exports = createPageRenderer;