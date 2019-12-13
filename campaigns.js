'use strict';

looker.plugins.visualizations.add({
    create: function(element, config) {
        element.innerHTML = `
            <style>
            .campaigns-table {
                display: flex;
                flex-direction: column;
                background: #ffffff;
            }
            .campaign-cell {
                display: block;
                background: #f3f3f3;
                margin-bottom: 10px;
            }
            </style>
            <pre class="campaigns-table"></pre>
        `;
    },
    updateAsync: function(data, element, config, queryResponse, details, done) {
        let campaignsElement = element.querySelector('.campaigns-table');
        let html = `${JSON.stringify(queryResponse)}`;
        for (let campaign of data) {
            html += `
            <div class="campaign-cell">
                ${JSON.stringify(campaign)}
            </div>
            `;
        }

        campaignsElement.innerHTML = html;

        done();
    }
})
