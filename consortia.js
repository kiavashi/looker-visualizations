'use strict';

looker.plugins.visualizations.add({
    create: function(element, config) {
        element.innerHTML = `
            <style>
            .consortia-table {
                background: #ffffff;
                font-family: "Avenir Next","Open Sans",Helvetica,Arial,sans-serif;
                display: flex;
                flex-direction: row;
            }
            .consortia {
                display: block;
                background: #f3f3f3;
                margin-right: 10px;
                border-radius: 5px;
                cursor: pointer;
                padding: 10px 15px;
                min-width: 200px;
            }

            .consortia-title {
                font-size: 18px;
                color: #434343;
            }

            .consortia-content {
                display: flex;
                flex-direction: row;
            }

            .consortia-percent {
                flex-grow: 1;
                font-size: 26px;
                color: #70AC39;
            }

            .consortia-count {
                font-size: 16px;
                color: #a8a8a8;
                text-align: right;
            }
            </style>
            <div class="consortia-table"></div>
        `;
    },
    normalizeData: function (data) {
        const consortiaMap = new Map();
        let companies = new Set();

        for (let row of data) {
            const consortiaId = row['pi_consortia.id'].value;
            const companyId = row['pi_customer_company.company_id'].value;

            if (!consortiaMap.has(consortiaId)) {
                consortiaMap.set(consortiaId, {
                    id: consortiaId,
                    name: row['pi_consortia.consortia'].value,
                    members: []
                });
            }

            const consortia = consortiaMap.get(consortiaId);

            if (!consortia.members.includes(companyId)) {
                consortia.members.push(companyId);
            }

            companies.add(companyId);
        }

        let normalized = Array.from(consortiaMap.values());

        normalized = normalized.map(consortia => {
            const memberCount = consortia.members.length;
            consortia.members = memberCount;
            consortia.total = companies.size;
            return consortia;
        }).filter(c => c.id);

        return normalized;
    },
    updateAsync: function(data, element, config, queryResponse, details, done) {
        let consoritium = this.normalizeData(data);
        let consortiumElement = element.querySelector('.consortia-table');
        let elements = [];

        for (let consortia of consoritium) {
            let consortiaElement = document.createElement('div');
            consortiaElement.setAttribute('class', 'consortia');
            consortiaElement.innerHTML = `
                <div class="consortia-title">${consortia.name}</div>
                <div class="consortia-content">
                    <div class="consortia-percent">${
                        Math.round(100 * (consortia.members / consortia.total))
                    }%</div>
                    <div class="consortia-count">${consortia.members}/${consortia.total}</div>
                </div>
            `;
            let clickListener = function () {
                window.parent.parent.postMessage(JSON.stringify({type: 'consortia:click', id: consortia.id, name: consortia.name, members: consortia.members, total: consortia.total}), 'https://localhost:4443');
            };
            consortiaElement.addEventListener('click', clickListener);
            consortiaElement.clickListener = clickListener;
            elements.push(consortiaElement);
        }

        for (let consortia of Array.from(consortiumElement.querySelectorAll('.consortia'))) {
            console.log('removing listener');
            if (consortia.clickListener) {
                consortia.removeEventListener('click', consortia.clickListener);
            }
            consortiumElement.removeChild(consortia);
        }
        elements.forEach(el => consortiumElement.appendChild(el));

        done();
    }
});
