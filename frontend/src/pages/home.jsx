import ComoReservar from '../components/sitio/ComoReservar';
import GaleriaInicio from '../components/sitio/GaleriaInicio';
import HeroInicio from '../components/sitio/HeroInicio';
import PreguntasUbicacion from '../components/sitio/PreguntasUbicacion';
import ProximasFechas from '../components/sitio/ProximasFechas';
import QueIncluye from '../components/sitio/QueIncluye';
import '../components/sitio/inicio.css';

function Home() {
  return (
    <>
      <HeroInicio />
      <ProximasFechas />
      <QueIncluye />
      <GaleriaInicio />
      <ComoReservar />
      <PreguntasUbicacion />
    </>
  );
}

export default Home;
