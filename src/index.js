import {createFilter} from 'rollup-pluginutils';
import {compile} from 'ejs';
import fs from 'fs';
import path from 'path';

let outputCommon = false;

function getCssFilePath(tplFilePath, href) {
    return path.resolve(path.parse(tplFilePath).dir, href);
}

function loadCssStylesTo(code, tplFilePath) {
    const linkTagRegEx = /<link(?=.*\shref=['|"]([\w$-_.+!*'(),]*)['|"])(?=.*\srel=['|"]stylesheet['|"]).*>/g;

    return code.replace(linkTagRegEx, (match, href) =>
        href
            ? `<style>${fs.readFileSync(getCssFilePath(tplFilePath, href), 'utf8')}</style>`
            : '');
}

export default function({
                            include,
                            exclude,
                            loadCss,
                            compilerOptions = {
                                client: true, 
                                strict: true,
                                compileDebug: false,
                                minified: true
                            }
                        } = {}) {
    const filter = createFilter(include || ['**/*.ejs'], exclude);

    return {
        name: 'ejs',

        transform: function transform(code, tplFilePath) {
            if (filter(tplFilePath)) {
                const codeToCompile = loadCss ? loadCssStylesTo(code, tplFilePath) : code;
                const templateFn = compile(codeToCompile, Object.assign({filename: tplFilePath}, compilerOptions));

                let common = '';
                if(!outputCommon){
                    outputCommon = true;
                    common = `
(window || global).EjsHelper = {
    escapeFn: (function(){
        const es = ${templateFn.escapeFn.toString()};\n
        return es;
    })()
};\n`;
                }
                
                return {
                    code: common + `export default ${templateFn.toString()};`,
                    map: {mappings: ''},
                };
            }
        }
    };
}
